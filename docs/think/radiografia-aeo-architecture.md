# Radiografía AEO — Arquitectura

> **Tipo de documento:** Documentación técnica / arquitectura
> **Versión:** 1.0
> **Creado:** 2026-07-14 por Claude (TASK-1410)
> **Última actualización:** 2026-07-14
> **Owner:** Growth / Think · Comercial (es una herramienta de venta)
> **Task:** [`TASK-1410`](../tasks/complete/TASK-1410-aeo-article-xray.md)
> **Repo del runtime:** `efeonce-think` (NO `greenhouse-eo`)
> **Vive en:** `think.efeoncepro.com/muestras/<slug>-<token>`

---

## Qué es

Una **muestra de trabajo reutilizable** para propuestas comerciales. Recorre en cuatro pantallas un artículo de blog real —escrito de cero para el cliente— y **expone la capa técnica que lo hace citable por motores de respuesta**, junto con la evidencia de por qué ese artículo existe.

**El motor es reutilizable: el cliente es un payload, no código.** Primer caso: la licitación SKY (blog, vía Wherex, 2026).

## Por qué existe

En una licitación de contenidos **todas las ofertas dicen lo mismo** ("optimizamos para SEO y AEO"). Ninguna lo muestra. Las promesas viven como texto en un PDF, exactamente igual que las de la competencia.

La Radiografía cierra esa distancia: **cada elemento técnico apunta al número del diagnóstico que arregla**. El `potentialAction` no es "un campo más" — *es* el `Ser accionable: 8/100` que el AI Visibility Grader ya midió. El `FAQPage` es el 37.

Y hay una razón estructural por la que esta pieza puede probar algo que un PDF no puede: **el schema solo puede marcar contenido visible** (marcar contenido oculto es violación de política de Google). Esa restricción es el argumento — la pantalla partida **demuestra visualmente** que cada dato de la capa de máquina corresponde a algo que está en la página.

---

## Estructura: el flow de cuatro pantallas

Cada pantalla hace **un solo trabajo**, y cada una es **una lámina** para el deck.

| # | Ruta | Trabajo |
|---|---|---|
| ① | `/muestras/<slug>-<token>` | **El hueco.** El SERP real del término: quién ocupa hoy ese espacio y por qué el cliente no está. Es la portada y es el golpe. |
| ② | `…/articulo` | **El artículo.** A ancho completo, **sin acoplamiento**. Acá se LEE. El comité juzga lo que está comprando. |
| ③ | `…/radiografia` | **La radiografía.** El split con el acoplamiento. Funciona porque el evaluador **ya leyó** el artículo: la revelación aterriza en vez de competir por su atención. |
| ④ | `…/atomizacion` | **Dónde más vive.** Los átomos (video, pieza social, set de imágenes), cada uno con su capa de máquina y **su línea de sangre** al bloque del artículo que lo parió. |

> **Por qué NO una sola pantalla.** La V1 metía cinco trabajos en una página. El síntoma era que *"el artículo se veía plano"* — y la causa raíz era que **el artículo nunca tuvo espacio para ser leído**, porque un panel le comía el 46% del ancho. Se le había aplicado densidad de *product UI* a un artefacto **editorial**.

### La navegación

- **Riel pegajoso** con los cuatro pasos. Su trabajo no es navegar: es **avisar que el recorrido tiene más pantallas**.
- **"Siguiente" grande** al pie, con la frase que engancha a la siguiente.
- **Cada paso es una URL propia** → el deck puede enlazar directo a la que quiera.
- **View Transitions cross-document, CSS puro, cero JS** (`@view-transition { navigation: auto }`). La que cuenta la historia es la **② → ③**: el artículo que acabas de leer **se encoge y se convierte en el espécimen** bajo el instrumento. El chrome y el riel **no** se animan: son el marco estable del recorrido.

---

## Dirección de arte: dos zonas de marca

La pieza es un **instrumento**, y la separación de marca **es** el diseño.

| Zona | Marca | Rol |
|---|---|---|
| El artículo (izquierda / pantalla ②) | **Del CLIENTE** — fondo claro, su acento | Es el **espécimen** |
| Chrome + instrumento + átomos | **EFEONCE** — navy `#001a33` + azul `#0375db`, Geist/Poppins | Es la **máquina que lo lee** |

Hace tres cosas de una: pone la marca donde corresponde (**el análisis es nuestro: no puede hablar en el color del cliente**), vuelve los dos lados **inconfundibles** (por eso el ojo sabe dónde mirar), y **refuerza el disclaimer sin decir una palabra** — se *ve* que el artefacto del cliente está contenido dentro de nuestro instrumento.

### El acoplamiento es asimétrico

**La fuente susurra; el destino grita.** Si los dos gritan igual, el ojo no sabe cuál es la causa y cuál el efecto.

| | Tratamiento |
|---|---|
| **Fuente** (bajo el cursor) | tinte + barra lateral. **Sin outline** — ya la estás tocando |
| **Destino** (el pago) | outline + pulso + **marca de origen `←`** |
| **Dirección** | **chip `→ N datos`** que apunta a través de la canaleta y dice *cuánto* hay |
| **En reposo** | punto discreto en el borde derecho: *"esto se conecta con algo allá"* |
| **Apilado (móvil)** | el chip apunta `↓` y la marca de origen `↑`. El dato viene de arriba, no de la izquierda |

---

## Arquitectura de datos: el cliente es un payload

```
efeonce-think/
├─ src/content.config.ts                     ← colección `aeoXray` + schema Zod
├─ src/content/aeo-xray/<cliente>-<slug>.json ← EL PAYLOAD (el cliente vive acá)
├─ src/assets/muestras/<cliente>-<slug>/      ← las fotos (pipeline de Astro)
├─ src/pages/muestras/[slug]/[...step].astro  ← el flow (4 pantallas)
├─ src/components/aeo-xray/
│   ├─ Article.astro                          ← el espécimen (editorial)
│   └─ Instrument.astro                       ← la capa de máquina (navy)
├─ src/styles/aeo-xray.css                    ← tokens + acoplamiento + view transitions
└─ scripts/verify-aeo-xray.mjs                ← 36 asserts (el gate)
```

**El motor NUNCA conoce a un cliente.** Un `if (cliente === 'sky')` en un componente significa que la frontera se rompió.

### El schema Zod es el gate de calidad

No es decoración. **Obliga**, y **rompe el build** si falta:

- `alt` de al menos 10 caracteres por imagen (un `alt` vacío en una muestra que **exhibe** los alts sería una broma cruel)
- `credit.{author,license,url}` por imagen
- `source` + `asOf` por cada cifra de evidencia (*sin fuente y sin fecha, una cifra es una opinión con números*)
- `why` de ≥30 caracteres por técnica (**sin el "para qué", la muestra exhibe técnica y no argumenta nada**)
- `tier` (1/2/3) por nodo — sin él, `og:title` pesa igual que `FAQPage` y todo se aplana
- `token` de 12 hex

**Un payload incompleto no publica una muestra a medias: rompe el build.**

---

## ⚠️ Los invariantes (romper uno vuelve la pieza en contra)

### 1. 🔴 El JSON-LD se renderiza como TEXTO ESCAPADO

**Jamás dentro de un `<script type="application/ld+json">`.** Y la página **no** le pasa `jsonLd` a `BaseLayout`.

Emitirlo declararía, en **nuestro** dominio, que Efeonce publicó un artículo del cliente (`author: SKY`, `publisher: SKY`): un **dato estructurado falso**, ingerible por crawlers y motores de respuesta, **justo en la pieza cuya tesis es el rigor técnico**. Autogol perfecto, y el daño es **silencioso** — lo detectaría un crawler antes que nosotros.

El **assert 1** falla el gate si aparece **uno solo** en **cualquiera** de las cuatro pantallas.

### 2. `noindex` + fuera del sitemap

El `filter` de `@astrojs/sitemap` **ya existe** en `astro.config.mjs`: se **extiende**, no se inventa.

### 3. URL tokenizada: `/muestras/<slug>-<token>`

Sin token la URL es **adivinable**: quien recibe `/muestras/sky-…` puede probar `/muestras/<competidor>-…`. El día que le hagamos una muestra a un competidor directo de un cliente vigente, esa URL existe.

**Slug + token, no token opaco:** el evaluador **lee la URL antes que el H1**, y `sky-carretera-austral` dice *"esto lo hicieron para nosotros"*, no *"plantilla con el logo cambiado"*.

🔴 **El token se DECLARA en el payload, jamás se genera en el build**: uno aleatorio por build cambiaría la URL en cada deploy, **y esta URL va a una lámina y a una propuesta**. Generar: `openssl rand -hex 6`.

⚠️ Es **oscuridad, no seguridad** (no hay auth): quien tenga el enlace, entra. Para una muestra de trabajo, es justo lo que queremos.

### 4. Rótulo persistente "Ejemplo ilustrativo de Efeonce"

Niega **autoría** *y* **alojamiento**. En las cuatro pantallas, visible sin scrollear.

### 5. Cero imágenes generadas con IA

Licencia verificable + crédito visible. **Es la demostración del requisito 5 de las bases** ("imagen apta y libre de derechos o con permisos"), no una nota al pie.

### 6. NUNCA prometer el rich snippet de FAQ de Google

Google lo restringió en 2023 a sitios de gobierno y salud. El FAQ se marca por la **capa de máquina** (que un motor extraiga y cite), **nunca** por "la cajita en Google". Un evaluador que lo verifique y nos pille exagerando **destruye la credibilidad que la pieza vino a construir**.

### 7. 🔴 Cero cifras sin fuente y sin `as-of` — y cero tácticas sobre-declaradas

El schema obliga `source` + `asOf`. Pero hay un error más sutil, **y lo cometimos**: el nodo *"+41% con citas textuales — la táctica GEO de mayor lift"* estaba **mal aplicado**. La investigación (Princeton/Georgia Tech, KDD 2024) mide *Quotation Addition* = **citas de fuentes o expertos entre comillas**, no una frase propia destacada.

La salida no fue maquillar el claim: fue **declarar las tácticas que sí aplicamos y no estábamos reclamando** (*Cite Sources* +30% · *Statistics Addition* +32%), y que el nodo de la cita destacada diga **explícitamente por qué NO es el +41%**.

**En la pieza cuyo valor entero es no exagerar, sobre-declarar es el error más caro.** El assert 20 parsea los *stats* renderizados; el 20b exige lo simétrico.

### 8. La firma del artículo NO es adorno: es una corrección

El `BlogPosting` declara `author`, `datePublished` y `articleSection`. **El schema solo puede marcar contenido VISIBLE.** Sin la firma en la página, la muestra **violaría su propia tesis**.

### 9. Decir lo que falta SUMA

El artículo firma "Equipo editorial SKY" (la práctica actual del blog) y el schema **solo puede declarar lo que es cierto**. Pero es la versión **más débil posible de E-E-A-T**, justo en el eje donde SKY saca 37/100.

En vez de **inventar una persona** (fabricación) o **esconder el hueco** (deshonestidad), la muestra lo **declara**: nodo `author → Person (recomendación)`. **La muestra dice también lo que le falta** — y eso *es* el "venimos a aportarles".

Lo mismo con el video: la tarjeta dice explícito que **especifica el entregable y no lo simula**. Un reproductor con play y nada detrás sería la trampa que esta pieza existe para no cometer.

### 10. El motor nunca conoce a un cliente

Un `if (cliente === '...')` = la frontera se rompió.

---

## Tipografía: la ruta carga los pesos que pide, y el CSS no declara ninguno crudo

**El bug que hay que conocer (silencioso, y volvería solo).** La ruta pedía `Poppins` en peso **600/700** para cada H1, H2, H3 y cifra — y **nunca importó ninguno de los dos**. Los únicos `@font-face` de Poppins llegaban de rebote, desde `EfeonceSlogan` (**800 / 800i / 900i**, que son del lockup de marca).

**Un `@font-face` que falta no falla: sustituye.** El algoritmo de matching de **CSS Fonts L4 §5.2** busca, para un peso >500, el primer cut **≥ objetivo en orden ascendente**. Con solo {800, 900} disponibles, `600` → **800** y `700` → **800**. Las cuatro pantallas se dibujaban **ExtraBold** mientras el CSS decía 600, y como el 800 es un **cut real** (no una negrita sintética) se veía *pesado pero bien dibujado*. No lo cazó el build, ni el lint, ni un assert de string — el CSS **no mentía**; mentía el navegador.

Y la otra mitad del síntoma era la misma causa: contra un 800, la **Geist 400** —atenuada, a 13px, sobre navy, con `-webkit-font-smoothing: antialiased` adelgazando los trazos— leía como un hilo. El salto real era de **~400 puntos** donde el diseño quería ~200. No era una pareja tipográfica: era una **colisión**.

**Las reglas:**

1. 🔴 **La ruta importa explícitamente cada peso que su CSS usa.** Nunca heredarlos de un componente vecino: los pesos de ese componente son **suyos**, no un servicio.
2. 🔴 **Cero pesos crudos en la pieza.** Seis tokens con rol, no trece valores sueltos:

   | Token | Valor | Rol |
   |---|---|---|
   | `--w-display` | 600 | Poppins: H2/H3, cifras (17–40px). **Techo.** |
   | `--w-display-lg` | 500 | Poppins: titulares ≥40px |
   | `--w-quote` | 500 | Poppins: la cita — una voz, no un rótulo |
   | `--w-body` | 400 | Geist sobre claro |
   | `--w-body-dark` | 500 | Geist sobre navy |
   | `--w-label` | 600 | Geist: rótulos, `th`, overlines |

3. **Poppins es geométrica: engorda mucho más rápido que una grotesca.** Su 600 pesa ópticamente lo que en Geist sería un 700. **600 es su techo de display**; el 700/800 pertenece *solo* al lockup de marca.
4. **Compensación óptica: a mayor tamaño, MENOS peso.** El mismo 600 que sostiene un H3 de 19px se vuelve macizo a 48px y le cierra los ojales a la geométrica. El **tamaño ya carga la jerarquía**; el peso no tiene que repetirla.
5. **Sobre navy el texto sube un paso: `500` = el `400` del lado claro.** El texto claro sobre oscuro se percibe —y con antialiasing en gris se *rasteriza*— más fino. Misma voz, distinto sustrato.
6. **El artículo recupera el rasterizado del sistema** (`font-smoothing: auto`). Sobre claro, `antialiased` es **pérdida neta**: cambia subpíxel por gris y adelgaza. El panel oscuro **sí lo conserva** (ahí evita el florecimiento) y compensa con `--w-body-dark`.

**Lo blindan los asserts 36 y 37**, que comparan el peso **computado por el navegador** contra el sistema. Un assert de string no habría visto nada.

---

## Core Web Vitals: la pieza no puede reprobar su propio examen

Argumenta rigor técnico. Si el comité —o su área de TI— le corre un PageSpeed y sale mal, **se cae todo lo demás**.

Las imágenes **pasan por `astro:assets`** vía el helper `image()` de la Content Collection. **Nunca desde `public/`**, que salta el pipeline completo.

| | Antes (JPEG en `public/`) | Ahora |
|---|---|---|
| Imágenes en móvil | ~1.536 KB | **78 KB** |
| Imágenes en desktop | ~1.536 KB | **128 KB** |
| LCP | — | **52 ms** móvil · **112 ms** desktop |
| CLS | garantizado (sin `width`/`height`) | **0** |

⚠️ **Optimizar no arregla una fuente mal recortada.** El hero original era **933×1400 (vertical)** para pintarse como una franja 21:9: el navegador bajaba la imagen entera para mostrar un tercio. **Las fuentes se recortan al formato que realmente se muestra** (hero 21:9, inline 16:9).

## Accesibilidad (WCAG 2.2 AA)

- **El chip direccional es `content` de CSS** → era **sighted-only**. Cada bloque acoplable ahora **anuncia** cuántos datos produce (`.xr-sr`).
- **`<pre>` scrolleable = enfocable** (2.1.1).
- **2.4.11 (Focus Not Obscured):** el header pegajoso del instrumento **no puede tapar** el nodo al que se salta. El scroll respeta la altura del header — no el borde del panel.
- **El mouse quieto no le roba el acoplamiento al teclado.** Al enfocar con Tab la página scrollea, los elementos pasan bajo el cursor inmóvil y disparan `mouseover` fantasma. Hay seguimiento de modalidad de entrada.
- **Reduced motion:** todo a 0 ms. **El significado se conserva íntegro** — nunca estuvo en el movimiento, estuvo en la correspondencia.

## Móvil: la hoja inferior

Apilado, el instrumento queda a **diez pantallas** del artículo. Sin la hoja, tocabas un bloque, se encendía el chip *"↓ 3 datos"*… **y no pasaba nada más**: el argumento central de la pieza **no existía en un teléfono**.

Ahora el instrumento **sube como hoja inferior** al tocar, con tirador, botón de cierre y **focus return** al bloque que la abrió.

---

## El gate: `pnpm verify:aeo-xray`

**36 asserts.** No son cosméticos: cada uno nació de un bug real. Los que más importan:

| # | Qué impide |
|---|---|
| 1 | Publicar schema falso del cliente en nuestro dominio |
| 20 / 20b | Sobre-declarar una táctica · dejar de declarar las que sí aplicamos |
| 21 / 22 | Que la afordancia sea sighted-only · que el `<pre>` no sea alcanzable por teclado |
| 25-29 | Que la pieza repruebe su propio PageSpeed |
| 30 | Que el acoplamiento no exista en móvil |
| 31 / 32 | Que el artículo (②) se contamine con el acoplamiento · que la radiografía (③) lo pierda |

⚠️ **Un verify verde con una captura ilegible NO es un cierre válido.** Varios bugs solo se vieron **mirando** el frame — entre ellos, una regla CSS que nunca se agregó (el reemplazo apuntaba a una clase que ya no existía = **no-op silencioso**) y que dejaba los textos de lector de pantalla **visibles en pantalla**.

---

## Cómo se crea la muestra del siguiente cliente

Ver el **[manual](radiografia-aeo-manual.md)**. Resumen: `openssl rand -hex 6` + escribir un payload. **Cero código.**

## Follow-ups

- **Probe a nivel de artículo en el AI Visibility Grader.** Hoy los probes son **site-level**. No existe *"dame la URL de un artículo y evalúa su capa AEO"*. Esa capacidad convertiría esta muestra estática en una **herramienta** — y ya existe la mitad del motor (`src/lib/growth/ai-visibility/probes/html.ts` sabe extraer y aplanar JSON-LD).
- **Versión genérica sin marca de cliente**, indexable, como activo de captación en Think.
- **Pantalla ⑤ "Cómo se mide"** — los 8 indicadores que promete la oferta. Cierra el ciclo: propuesta → pieza → capa → distribución → **prueba**.
- **Un segundo payload.** Mientras exista un solo cliente, la reutilización del motor es **una hipótesis, no un hecho**.

## Cross-links

- [`TASK-1410`](../tasks/complete/TASK-1410-aeo-article-xray.md) — la task, con los seis deltas de diseño
- [Wireframe](../ui/wireframes/TASK-1410-aeo-article-xray.md) · [Contrato de motion](../ui/motion/TASK-1410-aeo-article-xray-motion.md)
- [Investigación Semrush del blog de SKY](../commercial/research/sky-blog-aeo-gap-2026-07.md) — de dónde salió el artículo
- [Licitación SKY](../commercial/tenders/sky-blog-2026/README.md) — el bid donde se usa
- [AI Visibility Grader](../architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md) — de dónde salen los números del diagnóstico
- Skills: `seo-aeo` (el oficio) · `astro` + su `efeonce-overlay.md` (el repo) · `modern-ui` · `typography-design` · `a11y-architect` · `copywriting`
