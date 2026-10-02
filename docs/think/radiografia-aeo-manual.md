# Radiografía AEO — Manual de uso

> **Tipo de documento:** Manual de uso / runbook
> **Versión:** 2.0
> **Creado:** 2026-07-14 por Claude (TASK-1410)
> **Última actualización:** 2026-09-30
> **Documentación técnica:** [Radiografía AEO — Arquitectura](radiografia-aeo-architecture.md)
> **Manual comercial:** [Usar la Radiografía AEO en venta y educación](../manual-de-uso/comercial/usar-radiografia-aeo-en-venta.md)
> **Repo del runtime:** `efeonce-think` (**NO** `greenhouse-eo`)

---

## Otro cliente: entrada recomendada

Usar el [kit reutilizable y guía de producción](aeo-xray-nuevo-cliente.md): crea un expediente neutral, compone con AXIS y abre una preview DEV por configuración. Conserva los cuatro pasos originales; no copiar el caso Pichincha ni generar un token legacy para una edición nueva.

## Extensión multipieza — experiencia publicada, 30/09/2026

El caso Banco Pichincha Perú ya se puede enviar desde **Think**, sin publicar Greenhouse.
Es una extensión del mismo `Experience.astro`: conserva lectura, radiografía acoplada,
proveniencia, derivados y coreografía entre etapas. Añade una landing completa y un artículo
con marca, módulos, fuentes y medios específicos por cliente. El selector conserva la etapa.

Hay **tres accesos distintos**; no intercambiar sus garantías:

| Carril | Uso | Seguridad y retiro |
|---|---|---|
| `/muestras/<slug>-<token>` | Legacy, incluido SKY | Payload estático histórico; token de oscuridad, sin autenticación |
| `/aeo-xray/r/sample_<clave>` | Muestra compuesta autónoma publicada por Think | Enlace no listado, contenido y medios públicos para quien tiene el enlace; retiro mediante redeploy |
| `/aeo-xray/r/xrg_<grant>` | Integración gobernada Greenhouse diseñada e implementada localmente | Ediciones inmutables, medios privados, TTL y revocación; **no validada como operativa en producción** |

La muestra autónoma no necesita flags, migraciones ni llamadas a Greenhouse. La fundación
Greenhouse permanece separada: ni el deploy Think ni su demo prueban permisos, storage,
migración o canary productivos. No promover Greenhouse para enviar este ejemplo.

Estado verificable de publicación al cierre del 30/09: Think
`be8d4841e1124818bd7f4c88d0d7ad7b970e5122`, deployment
`dpl_7AEWYHEiiWWUyCiwrcTj1US1e3vB`, `READY`, alias `think.efeoncepro.com`.
El enlace concreto del cliente se conserva en su expediente privado y en el registro runtime;
este manual usa placeholders. Es una fotografía del release, no comprobación de salud futura.

### Preparar y compartir una edición nueva

**Carril futuro gobernado.** El procedimiento siguiente describe el contrato implementado;
no ejecutarlo contra producción antes del release, migración y canary del provider. Para
compartir hoy una demo autorizada, seguir la publicación autónoma descrita más abajo.

1. Preparar un intent AXIS con landing/artículo, fuentes fechadas y `experience` completa por pieza.
   El contenido bancario va en la pieza; el aviso de demostración pertenece al marco de Efeonce.
2. Crear el caso por `POST /api/platform/app/growth/aeo-xray/cases` con `title`,
   `prospectReference` e `intent`. La organización dueña se resuelve desde la identidad interna
   vigente; el prospecto no concede acceso. No hay editor visual nuevo.
3. Cargar cada PNG/JPEG/WebP por `POST .../cases/<caseId>/assets` como cuerpo binario.
   La API normaliza a WebP privado y devuelve identidad, hash y dimensiones. Reemplazar las
   referencias de preview por esos valores; la emisión rechaza medios públicos o ajenos al caso.
4. Actualizar `PATCH .../cases/<caseId>/draft` con `expectedRevision` e `intent` completo.
   Una revisión obsoleta requiere releer el caso y reconciliar, no sobrescribir a ciegas.
5. Emitir `POST .../cases/<caseId>/editions` con `expectedRevision` e `idempotencyKey`.
   Se congela el manifest validado. Cambiar el borrador no cambia esta edición.
6. Crear `POST .../editions/<editionId>/shares` con `expiresInDays` y `label` opcionales.
   El enlace se devuelve una sola vez; no usar el header `Idempotency-Key` en esta operación.
   No registrar ni pegar el bearer en evidencias. Si se pierde, revocar el grant y crear otro.
7. Revocar con `POST .../shares/<grantId>/revoke` y `{}`; retirar la edición con
   `POST .../editions/<editionId>/withdraw` y `{}`. Verificar tanto documento como imágenes.

Todos los endpoints de autoría requieren sesión interna autorizada y capacidades X-Ray actuales.
La lectura pública usa el grant exacto, default OFF con `AEO_XRAY_SHARING_ENABLED`; una habilitación
productiva necesita migración, distribución AXIS, release de Greenhouse/Think y readback reales.
El TTL predeterminado es 30 días, máximo 90. Las imágenes revalidan el acceso en cada solicitud.

### Verificación antes del envío

Recorrer las cuatro etapas de ambas piezas a desktop y móvil; revisar fotografías, copy, TOC,
acoplamiento, derivados, teclado, sin JS y movimiento reducido. Distinguir propuesta, implementado,
verificado y medido: la muestra no prueba resultados del sitio bancario. El guion audiovisual
propuesto no es un video producido. Revalidar tasas y condiciones oficiales antes de enviar.

Pruebas locales: `node scripts/qa/verify-aeo-xray-distribution.mjs`, tests de `src/lib/aeo-xray`
y `python3 scripts/qa/verify-aeo-xray-local-pg.py` en Greenhouse; build y verificadores X-Ray en Think.
El runner PG usa una base efímera aislada. [ADR de la extensión](../architecture/EFEONCE_AEO_XRAY_COMPOSITION_AND_SHARING_DECISION_V1.md).

---

## Para qué sirve

Es una **muestra de trabajo** que se le entrega **por enlace** a un cliente, a un prospecto o a un comité de licitación.

Muestra, en cuatro etapas: **La oportunidad** sustentada en investigación, **La pieza** completa (landing o artículo), **La radiografía** que explica su capa técnica y **Dónde más vive** el contenido (video, social, imágenes). No garantiza citación ni ranking por aplicar una estructura.

### Hace DOS trabajos — no los confundas

| | Trabajo | Cuándo la alcanzas |
|---|---|---|
| **1** | **Educar** (cliente y potencial cliente) | Cuando alguien **no entiende** qué significa "aparecer en ChatGPT" — lo confunde con SEO, o cree que es magia. La pieza enseña la diferencia **sin una lámina de teoría**. Sirve **sin venta en curso**: educar a un prospecto, o explicarle a un cliente vigente qué le estamos haciendo |
| **2** | **Habilitar la venta** | Licitación, RFP o pitch. Le da al comercial un **enlace**, una **lámina** para el deck, algo que **presentar en vivo**, y una prueba que el comité **puede verificar solo** |

**La usan:** el equipo comercial (envía el enlace, presenta en vivo), Growth/AEO (elige el hueco y escribe el artículo) y el equipo que arma el deck.

🔴 **Gate humano: el operador elige el ángulo.** El agente no elige el artículo.

**No es** un lead magnet: no captura, no pide email, no tiene formulario — **y no debe tenerlo.**

> **Encuadre completo (los dos trabajos, cuándo NO usarla, qué la hace frágil):** [documentación funcional](../documentation/comercial/radiografia-aeo-muestra-de-trabajo.md).

---

## El caso vivo hoy

**SKY — licitación de blog (Wherex, 2026; adjudicada a Efeonce el 2026-09-23):**

```
https://think.efeoncepro.com/muestras/sky-carretera-austral-861c18cc0e37
```

Cuatro pantallas: `/` (el hueco) · `/articulo` · `/radiografia` · `/atomizacion`.

---

## Antes de empezar

- Repo: `~/Documents/efeonce-think` (proyecto Vercel propio, **distinto** de `greenhouse-eo`).
- `pnpm install` (necesita `sharp` para optimizar las imágenes; ya está en `devDependencies`).
- Acceso a Semrush (para elegir el artículo con dato, no con intuición).

---

## Procedimiento legacy — conservar muestras existentes

El procedimiento SKY de esta sección es histórico. Para un cliente nuevo, usar el kit
[landing + artículo](aeo-xray-nuevo-cliente.md) y elegir expresamente el carril de distribución.
No copiar tokens ni datos de SKY/Pichincha.

### Cómo se creó la muestra legacy

**El cliente es un payload, no código.** No se toca ni un componente.

### 1. Encontrar el hueco (Semrush)

**No elijas el artículo por intuición.** Si el artículo no salió de un dato, el panel de evidencia es decorativo y la pieza **miente sobre su propio método**.

Busca el cruce de **tres** condiciones (no una):

1. una pregunta **con volumen** (base `cl` para Chile);
2. que el cliente **hoy no posee** (no rankea, o rankea mal);
3. sobre la que el cliente tenga un **ángulo legítimamente propio** — algo que sabe *porque es quien es*, y que un competidor de contenido solo puede copiar.

> ⚠️ **Buscar solo volumen produce un *commodity*.** Una guía genérica que cualquiera escribe — y por eso las citas se las llevan terceros.

> ⚠️ **Semrush mide Google, no el espacio de prompts de los LLM.** Las preguntas tipo *"requisitos para viajar a X"* tienen volumen casi nulo en Google y son **exactamente** lo que la gente le pregunta a ChatGPT. Por eso el artículo se **ancla** en el término con volumen (verificable por el comité) y se **estructura** para el *fan-out* (donde el motor realmente cita). **Son dos capas, no una.**

Deja la evidencia en `docs/commercial/research/<cliente>-<tema>-<fecha>.md`.

🔴 **Gate humano: el operador elige el ángulo.** El agente no elige el artículo.

### 2. Generar el token

```bash
openssl rand -hex 6
```

🔴 **Se declara en el payload, JAMÁS se genera en el build.** Un token aleatorio por build cambiaría la URL en cada deploy — **y esa URL va a una lámina y a una propuesta**.

### 3. Escribir el payload

```
src/content/aeo-xray/<cliente>-<slug>.json
```

Copia `sky-carretera-austral.json` como referencia. Contiene: el flow, el hueco (SERP), el artículo, la capa de máquina, la evidencia, los átomos y el copy de la interfaz.

**El artículo se escribe contra un checklist medido, no "bonito":**

> ⚠️ **Las cifras de abajo son las CORREGIDAS.** La versión anterior de esta tabla sobre-declaraba: decía *«2,3× más citas con una tabla»* (era una **prevalencia entre corpus**, no un lift) y atribuía el 72,4% sin citarlo. Ver el invariante **13**.

| Requisito | Por qué (con su fuente) |
|---|---|
| **Cápsula de respuesta** bajo cada H2 | El **mecanismo** es lo que la sostiene, y no necesita cifra: el motor recupera **pasajes**, y un pasaje que se entiende solo se puede citar. *(El 72,4% de las entradas citadas por ChatGPT tiene una — Search Engine Land, 15 dominios — pero es un **base rate sin grupo de control**: describe el patrón, no prueba el lift.)* |
| **Cada H2 = una sub-pregunta del fan-out**, autocontenida | La evidencia primaria más fuerte: sobre **1,4M de prompts**, lo que más separa a una página citada de una recuperada-y-no-citada es la **relevancia semántica del TÍTULO** frente a la sub-pregunta (0,656 vs 0,484 — Ahrefs) |
| **≥1 tabla** | El **30%** de las páginas que ChatGPT cita contienen una tabla, contra el **13%** de las que rankean en Google *(Nectiv)*. ⚠️ Es una razón de **prevalencia**, NO un lift por agregar una tabla — y **no incluye listas** |
| **Datos con unidad y fuente** | *Statistics Addition*: **+32%** *(Aggarwal et al., KDD 2024)*. ⚠️ Medido sobre **GPT-3.5 + top-5 de Google**, en *participación dentro de la respuesta* (no citas), y con lift que **varía por dominio** |
| **Fuentes autoritativas enlazadas** | *Cite Sources*: **+30%** *(mismo paper, mismas advertencias)* |
| **Entidades ancladas al Knowledge Graph** | `about` + `mentions` con `sameAs` a **Wikidata**. Un motor razona con **entidades**, no con palabras clave: «Balmaceda» es una cadena de texto hasta que se la ancla a un identificador que la máquina ya conoce |
| **Índice con anclas** | Un mapa para el humano; un ancla por sección para el motor |

#### 🔴 Cómo se ESCRIBE (y no es lo mismo que cumplir el checklist)

**Un artículo puede pasar los 46 asserts y ser ilegible.** Cargar la skill **`copywriting`** (módulos 03 hooks · 04 storytelling · 07 craft) y **`seo-aeo`** es obligatorio.

**Son dos capas, no una voz:**

> **La cápsula RESPONDE. El párrafo cuenta lo que la respuesta NO dice.**

La cápsula **no se puede conversacionalizar** —es seca y answer-first por diseño, y es lo que el motor extrae—. Pero si dejas *todo* en voz de cápsula, la pieza se lee como un manual. El párrafo que la sigue es donde vive el **narrador**.

**La cápsula puede SER el hook.** Answer-first ≠ voz de diccionario:

```
❌  «La Carretera Austral (Ruta 7) recorre 1.247 km entre Puerto Montt y…»   ← enciclopedia
✅  «Hay dos formas de empezar la Carretera Austral. Una: manejar los 1.247
     km y subir el auto a dos barcazas. La otra: volar a Balmaceda y estar
     en la mitad de la Ruta 7 antes del almuerzo.»                          ← gancho
```

Las dos son answer-first, autocontenidas, 40-60 palabras. **Solo una engancha.**

**El lector es el héroe; el artículo es el guía (StoryBrand).** Nunca al revés. Y **un hilo conductor** que se enuncia al principio, cruza todas las secciones y **cierra**.

**Y el registro conversacional es oficio, no adorno:** preguntas al lector, remates cortos (*«Son agua.» «Por lado.»*), antítesis, anáfora, apartes con humor, y **cadencia** (una frase larga que fluye; después una corta; **golpea**). Un artículo correcto y aburrido no lo lee nadie.

### 4. Las imágenes

```
src/assets/muestras/<cliente>-<slug>/
```

🔴 **NUNCA en `public/`** — salta el pipeline de Astro y la pieza reprueba su propio PageSpeed.

- 🔴 **TODAS a 16:9, hero incluido.** Sacar una franja 21:9 de una foto 3:2 **tira el 60% del alto**: se va el primer plano y queda cielo. Desde 3:2, un 16:9 recorta apenas **16%**. **El formato se elige por la foto, no al revés.**
- **Recorta la fuente al formato que se muestra, a 2× retina** (hero 2800×1575, inline 2000×1125). El source de 5760px **nunca se sirve**: Astro emite AVIF al ancho exacto vía `srcset`.
- ⚠️ **NO uses recorte por entropía (`sharp.strategy.attention`)** — se comió la carretera del hero. Centrado, o desde el borde donde vive el sujeto.
- **En el caso SKY original: fotografía licenciada, sin generación IA.** En casos nuevos el operador puede autorizar generación; registrar procedencia, derechos y disclosure. Una persona generada nunca es un testimonio ni fotografía documental del cliente.
- El `alt` **es contenido** de la muestra (se exhibe): descríbelo de verdad, **desde el metadata de la foto, nunca desde su título**.

**Fuente: Shutterstock** (credenciales en Secret Manager; ver `TASK-1411`). Wikimedia sirve de respaldo pero sus fotos son de aficionado — **y sus miniaturas se ven pixeladas** (bájate el **original**, no el thumb).

🔴 **Verifica cada foto contra su `description`, NUNCA contra sus keywords.** Nos pasó: `789778528` se buscó como «Carretera Austral» y **era la Ruta 40 de ARGENTINA** — con `carretera` **y** `chile` entre sus keywords. De 13 candidatos "obvios", **9 eran de otra región o de otro país** (Torres del Paine, Argentina, Atacama). Y **`is_editorial` debe ser `false`**: una editorial no se puede usar comercialmente.

### 5. Construir y verificar

```bash
pnpm build
XRAY_SAMPLE=<cliente>-<slug> pnpm verify:aeo-xray
```

**46 asserts.** Si el payload está incompleto, **el build falla** — no publica una muestra a medias.

### 5b. 🔴 LEER el artículo (el paso que el gate NO puede hacer)

```bash
pnpm read:aeo-xray <cliente>-<slug>
```

**El gate dio 40/40 con un artículo que se contradecía a sí mismo en siete puntos.** Y no podía verlo: los asserts verifican **estructura**, y **la coherencia argumental no es una propiedad estructural**.

El script imprime cada párrafo del narrador **pegado a su cápsula**. Léelo y responde tres preguntas:

1. ¿Algún párrafo **afirma** algo que otro bloque desmiente? *(la peor)*
2. ¿Algún párrafo **repite** su cápsula en vez de aportar? *(sobra)*
3. ¿Algún párrafo discute con un adversario **inventado**?

⚠️ **Un verify verde sobre un artículo incoherente es peor que uno rojo: te deja tranquilo.**

### 6. Mirar el frame

⚠️ **Un verify verde con una captura ilegible NO es un cierre válido.**

Las capturas quedan en `.captures/aeo-xray/`. Los frames para la lámina:

- **`slide-oficio.png`** — la cápsula de respuesta ↔ el 72,4%
- **`slide-competencia.png`** — el H2 ↔ quién ocupa hoy ese espacio

### 7. Desplegar

```bash
git push origin HEAD:main   # el deploy de Vercel es automático
```

Después **verificar contra la URL de producción** (no contra el build local):

```bash
curl -s -L "https://think.efeoncepro.com/muestras/<cliente>-<slug>-<token>" | grep -c 'application/ld+json'   # → 0
```

---

## Qué significan las señales de la pantalla

| Lo que ves | Qué significa |
|---|---|
| **Punto en el borde derecho** de un bloque del artículo | Ese bloque **se conecta con algo** en el panel |
| **Chip `→ 3 datos`** al pasar el cursor | Ese bloque produce **3 datos** en la capa de máquina. Mira a la derecha |
| **Marca `←`** en un nodo del panel | *"Yo vengo de ese bloque de allá"* |
| **Lo demás atenuado** | Hay un acoplamiento activo. Lo encendido es lo que produce el bloque que estás tocando |
| **`ARREGLA 8/100`** en un nodo | Ese elemento técnico **mueve ese número** del diagnóstico del cliente |
| **Nivel 3** (nodos callados) | Prueba de **completitud**, no argumento (`og:title`, canónica) |
| **Bloque amarillo** ⚠️ | **Honestidad**: algo que la muestra NO puede fingir, y lo dice |

**En móvil**: la ③ abre con el artículo. Tocas un bloque y el instrumento **sube como hoja inferior** con lo que ese bloque produce; si no tocas nada, la máquina no compite con la lectura.

---

## Qué NO hacer

🔴 **NUNCA emitir el JSON-LD del artículo como marcado activo.** Se muestra como **texto**. Publicarlo declararía, en *nuestro* dominio, que Efeonce publicó un artículo del cliente: un **dato estructurado falso** — justo en la pieza cuya tesis es el rigor técnico. El daño es **silencioso**.

🔴 **NUNCA prometer el rich snippet de FAQ de Google.** Lo restringió en 2023 a gobierno y salud. Se marca por la **capa de máquina**, nunca por *"la cajita en Google"*.

🔴 **NUNCA reclamar una táctica que no aplicaste.** Nos pasó: le atribuimos el **+41%** (*Quotation Addition* = citar **fuentes**) a una cita destacada nuestra. En la pieza cuyo valor entero es **no exagerar**, ése es el error más caro — y el primero que un evaluador técnico caza.

🔴 **NUNCA inventar datos para tapar un hueco.** Si al cliente le falta algo (un autor con credencial, un video producido), **la muestra lo declara**. Decir lo que falta **suma**; simularlo **la destruye**.

🔴 **NUNCA hardcodear un cliente en un componente.** Si escribes `if (cliente === '...')`, la frontera se rompió y el motor dejó de ser reutilizable.

🔴 **NUNCA dejar anotación en la pantalla ②.** Se llama *«El artículo — lo que ve el lector»*. Si lleva rótulos de «Respuesta directa» o **recuadros de color**, entonces **no es lo que ve el lector**: es lo que ve el analista, y la pieza se contradice en su propio título. Con la anotación encima **nadie aprecia el artículo — solo ve la anotación**. Todo el aparato va en la ③, que es donde el trabajo *debe* verse. ⚠️ **Sacar el rótulo y dejar la caja no arregla nada**: un recuadro de color grita «acá hay una técnica aplicada» igual de fuerte.

🔴 **NUNCA escribir el narrador sin releer el artículo completo.** Es exactamente cómo la pieza terminó **desmintiéndose a sí misma en siete puntos** con el gate en verde. Corre `pnpm read:aeo-xray` y **léelo**.

🔴 **NUNCA corregir un dato del artículo sin buscarlo en TODO el payload.** La prosa vive en **tres capas** —el artículo, la capa de máquina y los átomos— y las tres las lee el evaluador. Nos pasó: el artículo se corrigió a «los **dos** transbordadores» y el «**tres**» sobrevivió en **seis** lugares (meta description, `BlogPosting`, y el título/descripción/guion/`VideoObject` del video). En la ③ quedaban **lado a lado**: la cápsula decía dos, la meta description decía tres. Cuando cambies un número, `grep` el viejo en el payload entero.

🔴 **NUNCA hacer que la muestra hable de NUESTROS documentos, ni que narre su propia interfaz.** La pregunta ante cada línea: *¿esto se lo digo al cliente, o se lo estoy explicando al que construyó la herramienta?* Nos pasó dos veces seguidas: la ④ abría con *«**Nuestra oferta** dice, textual…»* (le hablaba al comité sobre nuestro PDF — la muestra queda como nota al pie de la propuesta, y huérfana si mandas el enlace sin ella), y el reemplazo seguía enfermo: *«**cada pieza de abajo** nace de un bloque…»* (eso **narra la pantalla**). ⚠️ **La línea es fina:** hablar del artefacto para ser **honesto** es correcto y obligatorio (el disclaimer, el schema que no se emite, *«especifica el entregable y no lo simula»*). **Narrar la interfaz, no.** El copy **argumenta**. Citar las **bases del cliente** sí vale — es su documento. El assert **34b** caza la autorreferencia; la acotación de escenario es **juicio**, no tiene gate.

🔴 **NUNCA publicar una cifra cuya FUENTE no se pueda googlear.** No basta con poner *una* fuente: el evaluador va a buscar el nombre del estudio. Nos pasó — se publicó *«AI Platform Citation Source Index 2026, 680M de citas, 6 estudios»* y **ese estudio no existe con ese nombre** (el dato es de Bluefish vía Adweek; los 6,1M de citas son de otro sub-hallazgo; son 4 firmas). Un nombre de fuente inventado, en la pantalla cuyo producto es la verificabilidad, **es peor que no poner el dato**. ⚠️ Y una **prevalencia** no es un **lift**: el «2,3× más citas con una tabla» era en realidad *«el 30% de las páginas que ChatGPT cita CONTIENEN una tabla, contra el 13% de las que rankean en Google»* — una razón entre corpus. Confundirlas es **el error del +41% otra vez**. El schema ahora exige `source` + `asOf` en **toda** cifra y **rompe el build** sin ellas.

🔴 **NUNCA dejar que el instrumento se repinte a sí mismo.** El acoplamiento nace en el **ARTÍCULO** y viaja al instrumento — nunca al revés. Si el panel escucha el foco de su propio lado, **se colapsa bajo el usuario de teclado** y lo expulsa. Y **NUNCA ocultar bajo el foco**: `display:none` saca el nodo del árbol de accesibilidad, el foco cae al `<body>`, y el evaluador aparece al inicio de una página de 9.000px sin entender qué pasó.

🔴 **NUNCA un control que desaparece al usarse.** El botón «Ver toda la capa» sólo existía en modo enfoque: al presionarlo salías del enfoque y **el CSS lo borraba bajo tu propio foco**. Queda `disabled` en su sitio.

🔴 **NUNCA `white-space: nowrap` en algo que puede crecer.** Decidió el ancho de la página **dos veces** (la píldora de métrica; el pie de licencias), las dos con el assert en verde — porque medía el **documento** y no los paneles, y a **390px** en vez de a los **320** que exige WCAG 1.4.10.

⚠️ **El fallo de accesibilidad va a aparecer en la línea que PRUEBA el cumplimiento.** El crédito de foto daba 3,3:1 — y el crédito visible **es** la demostración del requisito 5 de las bases. En una agencia que vende rigor, eso no es un bug: es el titular. **Pásale `axe` a la muestra antes de mandarla.**

🔴 **NUNCA inventar color narrativo.** *«Google te promete dos horas»* era falso — un hombre de paja para tener un gancho. En una pieza cuya tesis es el rigor, **el color inventado la destruye más rápido que la prosa plana**. Los específicos que hacen sonar al narrador *(la calamina, los 231 km sin bomba)* **se verifican y se citan**.

🔴 **NUNCA dejar un bloque acoplable sin contraparte.** Un huérfano **promete** algo al otro lado —se ilumina, invita a pasar el cursor— y **no cumple**, en silencio. Los asserts 40-41 lo cazan.

⚠️ **NUNCA abrir una cápsula definiendo el sujeto** (*«La Carretera Austral es…»*). Eso es una **entrada de enciclopedia** — la radiografía filtrándose al artículo. Es el tic más difícil de soltar cuando vienes de descomponer.

🔴 **NUNCA escribir un `font-weight` crudo, ni asumir que una fuente "ya está cargada".** Nos pasó: la ruta pedía Poppins 600/700 y **no había importado ninguno de los dos** — solo heredaba los 800/900 del slogan. **Un `@font-face` que falta no falla: sustituye.** Todos los titulares salieron **ExtraBold** durante días mientras el CSS decía 600, y se veía *pesado pero bien dibujado*, así que ningún gate lo cazó. Los pesos salen de los tokens (`--w-display`, `--w-body-dark`, `--w-label`…) y **la ruta importa cada peso que usa**.

⚠️ **Si le haces una muestra a un competidor directo de un cliente vigente**, recuerda que el token es lo único que impide que uno adivine la URL del otro. **No compartas el patrón de URL sin el token.**

---

## Problemas comunes

| Síntoma | Causa · Solución |
|---|---|
| **El build falla con un error de Zod** | Le falta un campo obligatorio al payload: `alt`, `credit`, `source`, `asOf`, `why` o `tier`. **Es el gate funcionando** — completa el dato |
| **Las imágenes no se optimizan** (`MissingSharp`) | `pnpm add -D sharp` |
| **El navegador muestra la versión vieja** | Caché. `Cmd+Shift+R` o ventana privada |
| **Una ruta nueva da 404 recién desplegada** | Carrera con el CDN. Espera un minuto y reverifica — **la ruta nueva se cachea como 404 antes de existir** |
| **El verify pasa pero la captura se ve mal** | **El verify no mira.** Abre el PNG |
| **La página pesa mucho en móvil** | Las imágenes están en `public/` (salta el pipeline) o la fuente está mal recortada |
| **La ③ móvil abre mostrando primero la máquina** | Regresión de arquitectura de información. En reposo debe verse el artículo; la capa de máquina sólo sube como hoja al tocar un bloque |
| **En la ④ móvil no se ve el paso activo del riel** | El riel horizontal debe centrar `aria-current="step"` al cargar. Un deep-link no puede esconder la pantalla actual |
| **La ④ se lee como tres tarjetas iguales** | El átomo social debe actuar como protagonista: desktop al centro y más ancho; mobile primero visualmente. No hardcodear el cliente para lograrlo |

---

## Referencias

- [Arquitectura](radiografia-aeo-architecture.md) — los invariantes vigentes, el flow, el gate
- [`TASK-1410`](../tasks/complete/TASK-1410-aeo-article-xray.md) — la historia completa, con los seis deltas de diseño y los bugs que cazó el gate
- [Investigación Semrush del blog de SKY](../commercial/research/sky-blog-aeo-gap-2026-07.md) — ejemplo de cómo se elige el artículo
- Skills a cargar al tocar esto: **`seo-aeo`** (el oficio · el schema tiene que ser defendible ante un comité que lo puede verificar), **`astro`** + su `efeonce-overlay.md` (el repo), `copywriting`, `modern-ui`, `typography-design`, `a11y-architect`


## Operación de la experiencia compuesta publicada

### Entrada y selección

La URL SSR acepta `artifact=<artifact.id>` y `step`. Los nombres visibles son **La oportunidad**,
**La pieza**, **La radiografía** y **Dónde más vive**; los valores técnicos mantienen `''`,
`articulo`, `radiografia` y `atomizacion` para conservar enlaces existentes. `articulo` sirve
la lectura de ambos tipos: no renombrar la query a `landing` para una landing.

Abrir `/aeo-xray/r/<clave>?artifact=<id>` presenta un telón azul. Lleva logo oficial del cliente,
«Esto preparamos para ti», botón «Haz click aquí», lockup Efeonce AEO y burbuja URL oficial
más abajo. El logo procede de `brand.logoAssetId`; hay fallback textual si no existe logo.
La cabecera posterior usa el mismo cliente y un lockup Efeonce AEO; X-Ray tiene su propia
barra de edición, con icono y subtítulo. El selector Landing/Artículo es un control segmentado
con iconos, estado activo y foco visibles; sus enlaces nativos conservan el paso actual.
La atribución «Demostración de Efeonce» queda al final, junto a legal y enlaces del footer.

La bienvenida se recuerda con `sessionStorage` por pathname, en la pestaña actual. Una
pestaña nueva permite repetirla; no pedir al cliente que borre cookies. Un enlace profundo a
lectura/radiografía/derivados entra directamente en ese destino. Back, cambio de pieza y
navegación interna no reintroducen el telón; almacenamiento bloqueado no impide continuar.

El `dialog` y `form method=dialog` mantienen teclado, Escape y apertura sin JavaScript.
Con JS es modal: foco dentro, scroll bloqueado, botón protegido de doble clic y foco al título
al terminar. Sin JS se cierra de forma inmediata; con movimiento reducido también.

### Coreografía y advertencia de build

La apertura normal dura **1400 ms**, con `cubic-bezier(0.65,0,0.35,1)`: el azul se desplaza
hasta `translateY(-100%)` y revela el contenido, que asciende desde 56 px. La secuencia de
pregunta/respuesta espera al evento `xray:curtain-opened`; `xray:curtain-opening` reinicia el
estado bajo la cubierta. No arrancar la simulación mientras el visitante mira la invitación.

**La CSS compilada puede serializar `1400ms` como `1.4s`.** La Web Animations API espera
milisegundos. `parseFloat` solo devolvería `1.4` y produciría el salto casi inmediato observado
por el operador. El componente lee el sufijo `ms` o `s` y convierte a milisegundos. El gate del
telón incluye esta conversión y verifica desplazamiento gradual real, no sólo CSS declarada.
Una corrección de motion exige comprobar el build y producción además del servidor DEV.

El `ClientRouter` conserva geometría compartida en lectura↔radiografía (`620ms`) y
preview↔pieza (abrir `820ms`, volver `700ms`). El selector usa `300ms`; sus textos/iconos
requieren una capa encima del indicador para no desaparecer durante el snapshot. Cambiar
**de artefacto** desactiva nombres compartidos del espécimen: no deformar una landing en
un artículo distinto. Listeners se reinician con `astro:page-load`, y los anteriores se limpian
antes del swap. Motion reducido elimina movimiento sin perder contenido ni rutas.

### La oportunidad

La portada explica el ángulo, conserva evidencia de investigación y agrega un recorrido
**ilustrativo** pregunta→respuesta→fuente. Incluye avance, repetición y acceso a la pieza que
respalda la respuesta. Es una demostración de recuperación y lectura, no una captura de
Google AI Mode, una respuesta observada de un LLM ni un resultado de posicionamiento.
No cambiar ese disclaimer por un logo de un motor que sugiera ejecución real.

Separar una métrica observada (consulta, mercado, proveedor, fecha) de la hipótesis de
contenido. El volumen no equivale a tráfico, conversiones ni frecuencia de prompts IA; no
sumar consultas solapadas para inflar demanda. Conservar snapshot y unidad en el expediente.

### La pieza: landing y artículo reales

`LandingModules.astro` agrupa bloques según `landingSections`: hero/imagen, respuesta,
beneficios, condiciones y comparación, pasos, documentación/confianza, FAQ, relacionado y
CTA. Cada sección conserva IDs y semántica; una tabla incompatible con un control visual
mantiene fallback completo. Iconos ayudan a localizar módulos, sin sustituir títulos ni texto.
El CTA bancario dirige al canal oficial; la demo no abre cuentas ni captura solicitudes.

El artículo mantiene byline propuesta, respuesta inicial, TOC con anclas, desarrollo narrativo,
respuestas autocontenidas, tabla, FAQ, CTA y fuentes. Los dos banners contextuales son
bloques reales dentro del desarrollo, uno para comparación y otro para preparación de la
apertura. Se sirven con proporción intrínseca, ALT, crédito y fuente; no como fondo invisible
sin procedencia. El crédito `Composición:` se presenta como «Diseño» y no «Foto».

Los productos, tasas y condiciones se reverifican antes de cada envío o reutilización. La
muestra Pichincha utiliza **Cuenta de Ahorros Preferente**, no cuenta corriente. Los números
son los de las fuentes de esa edición y fecha, no una promesa bancaria vigente indefinidamente.
No generalizar sobre moneda, saldo mínimo, mantenimiento ni proceso desde otro mercado.

**Fuentes consultadas del contenido:** banco, regulador y documentación que respalda sus
condiciones. DataForSEO se retiró de las fuentes editoriales; permanece donde corresponde,
en la observación de investigación y su metodología. Borrarlo del expediente destruiría
trazabilidad; añadirlo como fuente de tasas atribuiría una autoridad que no tiene.

### Valor SEO/AEO y radiografía

`ValueExplorer.astro` conecta cada pregunta de `experience.evidence.fanOut.items` mediante
`coveredBy` con el bloque real, respuesta, anotación y fuentes. Permite entender una decisión
sin leer primero JSON-LD. Una referencia huérfana o una explicación distinta entre el bloque,
la anotación y `machine.craft` debe fallar la revisión, no quedar como decorado.

En radiografía, lectura y máquina se acoplan mediante IDs/`coupleId`: hover, toque o teclado
seleccionan el origen y sus nodos; en móvil el inspector se abre como hoja. Expone meta,
encabezados, ALT, enlaces y schemas como texto escapado. **Cero JSON-LD activo** atribuido
al banco en Think. Canonical es propuesta, no publicación bancaria. No garantizar rich
results FAQ, rankings, citas en IA ni CWV del dominio cliente desde esta demo.

Anotaciones distinguen alcance `block/page/site` y estados `proposed/implemented/verified/measured`.
Un módulo implementado en la muestra no está implementado en pichincha.pe; una consulta
medida no convierte toda la propuesta en resultado medido. Site-level (robots, sitemap,
indexación, autoridad, infraestructura) exige revisión del sitio real y acceso correspondiente.

### Dónde más vive y reproducción

`SocialShowcase.astro` renderiza **todos** los átomos, sin tope de tres. El caso contiene tres
feeds, una Story y un video vertical de diez segundos; el video y la gráfica comparten un
formato seleccionable. Cada derivado tiene propósito, copy, CTA, detalle de producción,
disclosure y vínculo al bloque de origen. Ampliación y descarga permiten evaluar la pieza.

Con JS, pestañas accesibles admiten flechas/Home/End, reflejan selección en fragmento sin
sumar entradas artificiales al historial y pausan video al cambiar formato/ruta. «Video»
intenta reproducir; Play grande permite reanudar/repetir. Fallo de carga o reproducción muestra
estado recuperable y descarga; no asumir autoplay permitido. Sin JS todos los formatos y
controles nativos quedan accesibles. El gate verifica avance de `currentTime`, no sólo `<video>`.

### Expediente y archivos privados

El expediente del caso se conserva fuera de Git: carpeta **Banco Pichincha Peru — Prospect Case**.
Incluye research y sus snapshots, intent/manifests, medios y decisiones. Los masters y fuentes
se distribuyen en `06-Social-production`, `07-Video-production` y `08-Article-banners`.
No copiar API keys, grants gobernados, correos, notas CRM, prompts privados o originales
pesados al runtime. Registrar proveedor/modelo, solicitud/prompt autorizado, referencia,
consumo y responsable de revisión donde corresponda. Una autorización de generación/gasto
para Pichincha no autoriza otro cliente. No presentar modelos generados como personas reales.

Logo cliente oficial: verificar origen y versión; Efeonce AEO y burbuja URL se toman del paquete
AXIS autorizado sin vectorizaciones aproximadas. El runtime copia assets oficiales finales en
`public/branding/`; las entregas cliente del carril autónomo se sirven desde
`public/aeo-xray-media/<clave>/`, con autorización de distribución pública. Esto no es el
storage privado del carril gobernado. Los originales permanecen en el expediente.

### Publicar solamente Think

1. Componer y revisar en el kit [otro cliente](aeo-xray-nuevo-cliente.md).
2. Elegir explícitamente muestra pública no listada. Si contiene información confidencial,
   no usar `sample_*`; esperar al carril gobernado y su canary.
3. Registrar JSON `{key, editionId, model, assets}` en `src/lib/aeo-xray/published/` y su import
   en `published.ts`. Generar clave `sample_` aleatoria estable **una vez**, no en cada build.
   El mapa relaciona IDs lógicos con rutas de entregas autorizadas; no transportar rutas locales.
4. Copiar sólo medios finales autorizados a la carpeta de distribución; verificar hashes,
   MIME, dimensiones y carga. No duplicar los componentes por cliente.
5. Ejecutar gates abajo y abrir capturas reales. Stagear rutas propias y revisar diff.
6. Commit y push a `main` de `efeonce-think` sólo si están autorizados. El autodeploy Vercel
   usa proyecto Think y scope `efeonce-7670142f`; nunca promover develop→main de Greenhouse.
7. Esperar `READY`; contrastar `meta.githubCommitSha` con commit y alias productivo correcto.
   Leer el enlace en producción, ambos artefactos/cuatro pasos, headers, imagen y video.
8. Guardar deployment/SHA/readbacks y capturas en evidencia ignorada o expediente; compartir
   enlace por canal autorizado. Publicar no autoriza enviar email ni actualizar CRM.

Headers documento compuesto: `Cache-Control: private, no-store`, `X-Robots-Tag: noindex, nofollow`,
`Referrer-Policy: no-referrer`, `X-Content-Type-Options: nosniff`. Sin analytics y fuera del sitemap.
Los medios estáticos autónomos siguen públicos; esos headers no transforman el link en auth.
El `expiresAt` de compatibilidad en el registro no representa TTL real ni revocación central.
Retirar una muestra exige quitar registro **y medios** y redeploy/readback de ambos. Para
rollback registrar deployment anterior; evitar restaurar material retirado sin autorización.

### QA reproducible

Desde Greenhouse, antes de abrir Think:

```bash
node --test scripts/aeo-xray/client-kit.test.mjs
node scripts/aeo-xray/client-kit.mjs validate --dir /ruta/privada/caso
node scripts/aeo-xray/client-kit.mjs build --dir /ruta/privada/caso
```

Desde Think, con servidor de prueba corriendo y clave local elegida en entorno (no en Git):

```bash
pnpm type-check
pnpm build
pnpm test:aeo-xray-v2
node scripts/qa/verify-aeo-xray-distribution.mjs
XRAY_SAMPLE=sky-carretera-austral pnpm verify:aeo-xray
XRAY_VERIFY_BASE=http://127.0.0.1:4345 XRAY_VERIFY_TOKEN=fixture-pichincha pnpm verify:aeo-xray-v2
XRAY_VERIFY_BASE=http://127.0.0.1:4345 XRAY_VERIFY_TOKEN=fixture-pichincha node scripts/verify-aeo-xray-motion.mjs
XRAY_VERIFY_BASE=http://127.0.0.1:4345 XRAY_VERIFY_TOKEN=fixture-pichincha node scripts/verify-aeo-xray-value.mjs
XRAY_VERIFY_BASE=http://127.0.0.1:4345 XRAY_VERIFY_TOKEN=fixture-pichincha node scripts/verify-aeo-xray-media.mjs
XRAY_VERIFY_BASE=http://127.0.0.1:4345 XRAY_VERIFY_TOKEN=fixture-pichincha node scripts/verify-aeo-xray-curtain.mjs
```

Los gates bancarios usan IDs Pichincha y son regresión del caso: no certifican otro cliente
con IDs distintos. Sustituir el token sólo cuando el contenido es compatible; construir QA
proporcional del nuevo expediente sin hardcodear la UI. Fixtures son **sólo DEV**; un build
publicado debe negar `fixture-*`. Para canary de producción usar la clave real desde entorno,
guardar resultados privadamente y no pegarlos en docs. No correr HMR/ediciones simultáneas
sobre una prueba de transición: un reload del compilador invalida la observación.

Revisar desktop 1440, móvil 390 y compacto 320, tablet, overflow, contraste/foco, encuadres,
prosa completa, datos sensibles, fuente↔claim, video, no-JS, movimiento reducido y estados de
error. Capturas: `.captures/aeo-xray-v2`, `aeo-xray-motion`, `aeo-xray-value`, `aeo-xray-media`,
`aeo-xray-curtain`; son evidencia ignorada, no assets de entrega. Verde automático no sustituye
revisión de píxeles. No llamar a una medición local de demo «CWV del banco».

### Diagnóstico rápido

| Síntoma | Revisar | Acción |
|---|---|---|
| Telón desaparece instantáneamente | Preferencia reduced-motion, CSS compilada con `s`, sesión ya abierta | Repetir pestaña nueva; comprobar conversión de unidades en build; no desactivar accesibilidad |
| No aparece telón | Deep link o sesión recordada | Abrir primera etapa en pestaña nueva; comportamiento previsto |
| Texto activo del selector desaparece al cambiar | Capas de snapshots/indicador | Revisar transición real y z-index de nombres compartidos, no sólo DOM en reposo |
| Video no reproduce | Media path, MIME, carga, política de playback | Probar Video/Play y `currentTime`; leer estado visible; verificar archivo servido |
| Fixture da error | Map incompleto, hash distinto, ruta/symlink fuera de assets | Corregir expediente; no relajar containment ni usar `public/` como bypass |
| Preview conserva versión anterior | Build kit rechazado, manifest anterior conservado | Leer salida/exit code; no confundir draft nuevo con manifest viejo |
| Página muestra marca anterior | Servidor Astro existente o manifest equivocado | `astro dev status`; detener sólo sesión prescindible y reiniciar con expediente correcto |
| Grant gobernado no abre | Provider/flag/migración/canary pendientes | No improvisar auth; separar demo autónoma de integración futura |
