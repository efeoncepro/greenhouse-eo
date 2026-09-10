# 10 · ASO y descubrimiento de apps en la era de IA

> Carga para: fichas de App Store y Google Play, keywords y metadata de tienda,
> creativos de ficha, Custom Product Pages y Custom Store Listings, reseñas,
> experimentos, medición por fuente de adquisición y descubrimiento de apps por IA
> (Ask Play, Gemini, Personalized Collections, App Intents/Spotlight, directorio de
> ChatGPT).
> Sello: **as-of 2026-09-10**. Todo lo de tiendas es 🔴 volátil; datos con fuente en
> `SOURCES.md` §5.

**Frontera.** Este módulo es el oficio. Cómo se vende, se empaqueta y se cobra → skill
`seo-aeo-practice`. Compra de medios en tiendas (Apple Ads, Google App campaigns) → Reach.
Implementar App Intents, deep links o Engage SDK → el equipo de ingeniería del cliente o
Wave; aquí se diagnostica y se especifica qué exponer. **Los juegos quedan fuera**: su
descubrimiento depende de featuring editorial, LiveOps y UA pagado, que es otro oficio.

---

## 1. Por qué el ASO ahora vive junto al SEO/AEO

Hasta 2024 el ASO era un oficio aparte: keywords, screenshots y ratings dentro de dos
tiendas cerradas. Entre 2025 y 2026 las tiendas adoptaron lo mismo que cambió la búsqueda
web:

| Cambio | En la web | En las tiendas |
|---|---|---|
| La máquina interpreta, no solo indexa | Entidades, Query Fan-Out | Apple genera *App Store tags* con LLM desde la metadata ✅ |
| La respuesta reemplaza a la lista | AI Overviews, AI Mode | Ask Play responde preguntas y resume en los resultados ✅ |
| El ranking se personaliza | AI Mode, historial | Personalized Collections con App Notes ✅ |
| El descubrimiento sale del buscador | Asistentes de IA | Siri/Spotlight vía App Intents, Gemini, ChatGPT ✅ |

Consecuencia: el ASO reproduce las tres capas del §1 del `SKILL.md`.

```
┌──────────────────────────────────────────────────────────────┐
│ CAPA 3 — Descubrimiento por IA: Ask Play, Gemini,             │
│          Personalized Collections/App Notes, Siri/Spotlight   │
│          (App Intents), directorio de ChatGPT.                │
├──────────────────────────────────────────────────────────────┤
│ CAPA 2 — ASO clásico: rankear en la búsqueda de la tienda y   │
│          convertir la ficha.                                  │
├──────────────────────────────────────────────────────────────┤
│ CAPA 1 — Fundamentos compartidos: UNA sola entidad (nombre,   │
│          propuesta, categoría, features, precios) en la web,  │
│          la ficha, las reseñas y el Knowledge Graph.          │
└──────────────────────────────────────────────────────────────┘
```

La capa 1 es la que una práctica SEO/AEO ya domina y la que casi ninguna agencia de ASO
cruza. Es el aporte diferencial; las capas 2 y 3 son oficio que se ejecuta con rigor.

---

## 2. Intake adicional (sumar al §2 del `SKILL.md`)

| # | Pregunta | Por qué cambia la recomendación |
|---|---|---|
| A1 | ¿iOS, Android o ambas? ¿Qué storefronts (CL, MX, CO, PE…)? | Campos, experimentos y medición difieren por tienda y por país. En CL, MX, CO y PE Android tiene entre 66% y 82% de las páginas vistas móviles (StatCounter, ago-2026), y casi todo lo nuevo de Apple con IA es solo EE. UU.: en LATAM, Google Play suele ir primero |
| A2 | ¿Qué parte de las instalaciones es orgánica de tienda y cuál es pagada? | Si casi todo es paid UA, el ASO mueve poco y el cuello es medios |
| A3 | ¿Hay acceso a App Store Connect y Play Console? | Sin acceso, todo es estimado ◑, igual que SEO sin GSC |
| A4 | ¿Quién publica la ficha y con qué cadencia de releases? | En Apple, parte de la metadata solo cambia con una versión nueva: eso define el ritmo |
| A5 | ¿Es una actualización o una app nueva? ¿Hay historial de ratings? | Una app nueva parte sin señales de comportamiento |
| A6 | ¿La app es el producto o un complemento de la web? | Define si el puente web→app es la prioridad o un accesorio |
| A7 | ¿Categoría? | Juegos → fuera de este módulo |

---

## 3. Apple App Store

### 3.1 Lo que Apple documenta ✅

Fuente: [App Store search](https://developer.apple.com/app-store/search/).

- **Campos indexados:** nombre de la app, subtítulo, campo de keywords y categorías primaria
  y secundaria.
- **Campo de keywords:** 100 caracteres, términos separados por coma y sin espacios. Es
  invisible para el usuario.
- **Factores declarados:** relevancia textual (título, subtítulo, keywords, categoría
  primaria) y comportamiento de usuario (descargas, ratings y reseñas, "y más").
- **Ratings y reseñas** se muestran en la ficha y en los resultados, y pueden influir en el
  ranking.
- **App Store tags:** se generan desde la metadata de App Store Connect con IA y curación
  humana ([docs](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-tags))
  y aparecen en los resultados y en la ficha. El developer no las escribe: solo puede
  deseleccionar las que no quiere. 🔴 **Hoy solo existen en EE. UU. y se basan en la metadata
  en_US**: para un cliente LATAM todavía no aplican. La lección sí aplica: la metadata ya no
  solo se lee, se interpreta, y una metadata vaga produce etiquetas que describen mal la app.
- **In-app events y compras in-app promocionadas** aparecen en los resultados de búsqueda.

### 3.2 Lo que la comunidad ASO infiere ⚠️

- **El texto de los screenshots como señal.** Se detectó por anomalías en junio de 2025;
  Apple no lo documenta. Las pruebas controladas lo muestran como una señal débil que
  refuerza al título y al subtítulo más que hacer rankear por sí sola. Regla: los captions
  se escriben para convertir y en coherencia con la metadata; nunca se rellenan con
  keywords.
- **Lectura semántica conjunta** de metadata, creativos y reseñas: es la interpretación de
  los vendors tras WWDC 2026, no una declaración de Apple. Tratarla como hipótesis de
  trabajo, no como hecho.

### 3.3 Custom Product Pages ✅

Fuente: [Custom Product Pages](https://developer.apple.com/app-store/custom-product-pages/).

- Hasta **70** versiones adicionales de la ficha.
- Se les pueden **asignar keywords**: la CPP aparece en la búsqueda orgánica para esas
  keywords en lugar de la ficha por defecto. Cada combinación de keywords debe ser única por
  página y coincidir con su intención.
- **Deep link** propio por CPP (iOS/iPadOS 18 o superior).
- Apple reporta que referir a una CPP sube la conversión **2,5 puntos** en promedio, desde
  una media de **1,6%** en la ficha por defecto. Es un dato del propio Apple, sin
  metodología publicada: se cita como "Apple reporta", nunca como el lift esperado para un
  cliente (ver `ANTIPATTERNS.md` §"Una prevalencia no es un lift").

→ Una CPP por intención de búsqueda es la versión en tienda de "una página por intención".

### 3.4 WWDC 2026 ✅

Fuente: [Apple Newsroom, junio 2026](https://www.apple.com/newsroom/2026/06/apple-expands-app-store-capabilities-to-help-developers-grow-and-reach-new-users/).

- **Personalized Collections + App Notes.** Recomendaciones en las pestañas Apps, Games y
  Search según los intereses, el uso y las descargas de cada persona "y otra información del
  App Store", con una nota que explica por qué se sugiere cada app. En inglés en EE.UU. desde
  junio de 2026; otros idiomas y regiones "pronto". El developer no tiene control directo. No hay
  confirmación de disponibilidad en español ni en Chile, México, Colombia o Perú.
  Inferencia no documentada: lo que la alimenta es uso/retención y una metadata clara.
- **Creative Assets.** Imágenes y video en el header de la ficha y en los resultados de
  búsqueda ("este año").
- **Asset Library.** Creativos, previews y screenshots gestionados en App Store Connect,
  reutilizables en CPP e in-app events, y revisados sin publicar una versión de la app.

### 3.5 Fuera de la tienda: App Intents ✅

Fuentes: [App Intents](https://developer.apple.com/documentation/appintents) ·
[WWDC26 — Apple Intelligence](https://developer.apple.com/wwdc26/guides/apple-intelligence/).

Las acciones y entidades que la app declara con App Intents se vuelven descubribles en Siri,
Spotlight, Shortcuts y widgets. Con `IndexedEntity`, la búsqueda de Spotlight es semántica
(por significado, no por keyword exacta). WWDC26 sumó App Schemas y `RelevantEntities`, que
le sugiere al sistema entidades y el contexto en que son relevantes.

Es el equivalente iOS de "que el agente pueda usar el sitio, no solo citarlo" (skill
`webmcp`). Lo implementa el equipo de la app; nosotros diagnosticamos qué acciones y
entidades conviene exponer y lo especificamos.

---

## 4. Google Play

### 4.1 Campos ✅

Fuente: [Play Console — best practices for your store listing](https://support.google.com/googleplay/android-developer/answer/13393723).

- **Título** ≤30 caracteres · **descripción corta** ≤80 · **descripción larga** ≤4.000.
- Google pide lenguaje natural y advierte explícitamente contra la repetición de palabras
  (su ejemplo de lo que no hacer es una lista de keywords). No hay campo oculto de keywords:
  la descripción larga se escribe para personas y la tienda la lee como texto.
- Screenshots de la experiencia real en todos los dispositivos soportados; video de YouTube
  opcional; poco texto en los gráficos; el ícono no puede inducir a error.

### 4.2 I/O 2026 ✅

Fuente: [Android Developers Blog — I/O 2026](https://developer.android.com/blog/posts/i-o-2026-what-s-new-in-google-play).

- **Ask Play.** Búsqueda conversacional que entiende el contexto y los follow-ups para
  recomendar apps, más *Ask Play highlights* en los resultados. Google dice que su Q&A con
  IA ya responde el 95% de las consultas de los usuarios.
- **Descubrimiento dentro de Gemini** (app de Android y web): sugerencias de apps y deep
  links al contenido.
- **Engage SDK** en la ficha para usuarios existentes y en superficies de tablet, en más de
  80 mercados.
- **Play Console con Gemini:** genera una custom store listing a partir de una keyword
  recomendada con un clic, y pre-llena localizaciones desde CSV o Sheets para revisión. Lo
  generado se revisa contra la capa 1 antes de publicar: una ficha automática incoherente
  con la web rompe la entidad.
- **Qué fuentes usa Ask Play:** Google no lo detalla. Vendors de ASO afirman que lee la ficha
  y el sitio web de la app ⚠️. Si se confirma, la web del cliente influye directamente en
  cómo la tienda describe su app, otra razón para trabajar la capa 1. **No se usa como
  argumento de venta mientras Google no lo confirme.**
- **Disponibilidad:** Google no confirmó Ask Play ni el descubrimiento en Gemini en español
  ni en CL/MX/CO/PE ❌. Antes de venderlo como superficie activa, verificarlo en un
  dispositivo del país.

### 4.3 Custom Store Listings y experimentos

Fichas alternativas (por país, campaña o, desde I/O 2026, por keyword recomendada) y Store
Listing Experiments como A/B nativo. Se usan con la misma lógica que las CPP de Apple.

---

## 5. ChatGPT y otros asistentes

- OpenAI lanzó las apps en ChatGPT con el Apps SDK (octubre 2025), construido sobre MCP. El
  directorio de apps pasó a ser el **Plugin Directory** el 2026-07-09: un plugin agrupa
  skills, apps y plantillas ✅ ([OpenAI Help Center](https://help.openai.com/en/articles/20001256-plugins-in-codex)).
- Hoy el descubrimiento ahí depende sobre todo del nombre ⚠️.
- **Frontera:** construir una app o un plugin para ChatGPT es trabajo de Agent Systems &
  Platforms (Wave), no de ASO. Lo que sí es de este módulo: que los asistentes describan y
  recomienden correctamente la app móvil del cliente, que es trabajo de entidad (capa 1) y
  se mide con el panel de prompts de `07_MEASUREMENT.md`.

---

## 6. El puente web ↔ tienda ↔ IA

Es la parte que diferencia a una práctica SEO/AEO de una agencia de ASO pura.

1. **Una sola entidad.** El nombre de la app, la categoría, la propuesta de valor, las
   features y los precios dicen lo mismo en la web, en cada ficha, en la metadata de App
   Store Connect y Play Console, en las respuestas a reseñas y en los perfiles de marca.
   La inconsistencia confunde a los motores de IA igual que un NAP inconsistente confunde a
   Google Local (`06_LOCAL_INTERNATIONAL.md`).
2. **Landing de la app en la web.** Rankea las búsquedas del tipo "app de X" en Google y es
   la fuente que los asistentes leen. Enlaza a ambas tiendas; en iOS usa el Smart App Banner.
   Schema `MobileApplication` / `SoftwareApplication` solo con contenido visible en la página
   (principio 7 del `SKILL.md`): no copiar el rating de la tienda al JSON-LD sin validar antes
   la política vigente de review snippets de Google.
3. **Las fichas se indexan en Google.** Play Console reporta **Google Search (orgánico)** como
   fuente de adquisición: el efecto del SEO sobre la ficha se ve en la herramienta del
   cliente.
4. **Enlaces que se miden.** Universal links / App Links, links de campaña de App Store
   Connect y UTM en Play, para que el puente web→tienda aparezca como Web Referrer (en iOS,
   solo si el clic viene de Safari) o como canal etiquetado. El enlace tiene que funcionar con la app instalada y sin instalar, con
   sesión y sin sesión; la continuidad después de instalar se prueba, no se asume.
5. **Reseñas como contenido.** Las tiendas las usan en el ranking y la IA las lee. Se piden
   con los mecanismos nativos (la API de solicitud de reseñas de StoreKit y la In-App Review
   API de Google Play), sin incentivos y sin filtrar a los usuarios contentos. Se responden.
   Los temas recurrentes van al equipo de producto.
6. 🔴 **El volumen de Google Search no es la demanda de la tienda.** No se trasladan volúmenes
   de SEO como si fueran de ASO: la demanda de tienda se mide con datos de tienda (lección del
   workspace de Berel, `docs/commercial/tenders/berel-app-movil/estrategia-lanzamiento-INTERNO.md` §7).

---

## 7. Medición honesta

| Plataforma | Qué se mide ✅ | Qué NO se puede afirmar |
|---|---|---|
| **Apple** ([Acquisition](https://developer.apple.com/help/app-store-connect-analytics/acquisition/acquisition/)) | Descargas por fuente: App Store Search (**incluye los anuncios de Apple Ads en los resultados**), App Store Browse, App Referrer, Web Referrer, App Clip, Institutional Purchase; campañas propias; vistas de ficha y conversión. Ventas y uso quedan atribuidos a la fuente de descarga | Búsqueda orgánica pura: hay que restar Apple Ads, que se mide en otra consola. Términos de búsqueda orgánicos: la doc de fuentes no documenta esa dimensión. 🔴 **En iOS, Web Referrer solo cuenta Safari**: un clic desde Chrome aparece como App Referrer "Chrome". Exposición en Personalized Collections: sin fuente propia documentada |
| **Google Play** ([definiciones](https://support.google.com/googleplay/android-developer/answer/9859173?hl=en)) | Play Store orgánico: 🔴 **Search solo cuenta búsquedas del nombre de la app o de su marca**; las búsquedas de categoría ("racing game") y el autocompletado caen en **Explore**. Además: Google Search orgánico, Google Ads, UTM, referidos de terceros sin etiqueta, instalaciones sin visita a la ficha. **Hay dimensión de término de búsqueda.** Conversión de ficha con comparación contra pares | Comparar "Search" de Play con "App Store Search": miden cosas distintas. El efecto del ASO no-marca en Play aparece en Explore, no en Search |
| **Asistentes de IA** | Nada propio | ❌ Cuántas instalaciones viene de una recomendación de ChatGPT, Gemini o Siri: no hay source type ni estudio público |

Reglas:

- **Igual que en AEO, nunca se atribuyen instalaciones a una recomendación de IA.**
- **La ventaja frente al AEO:** el puente web→tienda sí se mide (Web Referrer, Google Search
  orgánico, UTM), y se mide en la cuenta del cliente, no en un dashboard nuestro. En iOS se
  subestima: sin Safari, el clic queda como App Referrer del navegador. Los links de campaña de
  App Store Connect ayudan a separarlo.
- ⚠️ **Posible quiebre de serie en Play:** terceros reportan que desde julio de 2026 los
  reportes de ficha miden clics (intención) en vez de adquisiciones. No está confirmado en la
  página de adquisición; verificar antes de comparar períodos y declarar el breakpoint si se
  confirma (misma disciplina que el cambio de fórmula de ETV en `07_MEASUREMENT.md`).
- **Muestra mínima.** Un experimento de ficha en una app con poco tráfico no alcanza
  significancia; un resultado sin muestra no se reporta como hallazgo (misma lógica que la
  curva de CTR propia en `07_MEASUREMENT.md`).

---

## 8. Playbook de auditoría ASO (en orden)

1. **Acceso y línea base.** 90 días por fuente, plataforma y storefront. Sin acceso, todo se
   marca como estimado ◑.
2. **Identidad del release y de la ficha por storefront.** Qué versión está publicada, qué
   cambia en la próxima y qué ficha ve cada país, antes de tocar nombres, categorías o
   enlaces.
3. **Mapa de intención por tienda:** marca, tarea y categoría, medido con datos de tienda.
4. **Metadata por campo y por tienda:** relevancia, claridad y duplicación entre campos.
   **Localización:** en App Store no existe español de Chile. Chile, Colombia, México y Perú
   usan Spanish (Mexico) por defecto, con English (U.K.) como idioma adicional
   ([Apple](https://developer.apple.com/help/app-store-connect/reference/app-information/app-store-localizations/)):
   la metadata de Chile y la de México son el mismo texto, y lo local se diferencia con CPP y
   creativos. En Google Play sí se diferencia por país con Custom Store Listings.
5. **Creativos:** primeros screenshots y captions por beneficio, video, ícono; coherencia con
   la metadata y con la web.
6. **CPP/CSL** por intención de búsqueda y por campaña, con deep link.
7. **Ratings y reseñas:** solicitud nativa, respuesta, temas recurrentes.
8. **Capa 1:** consistencia web↔ficha↔IA, más un panel de prompts ("mejor app para X en
   Chile") en ChatGPT, Gemini y Perplexity con el método de Share of Voice de
   `07_MEASUREMENT.md`. El AI Visibility Grader hoy no mide apps.
9. **Fuera de la tienda:** App Intents/Spotlight en iOS, Engage SDK en Android, deep links.
10. **Experimentos:** PPO en Apple y Store Listing Experiments en Google, una variable a la
    vez y solo con volumen suficiente.

Todo sale priorizado con RICE (§4 del `SKILL.md`). Anti-patrones de tienda:
`ANTIPATTERNS.md` §"Borde black-hat en tiendas de apps".

---

## 9. Qué no cambió

La relevancia textual y el comportamiento siguen siendo los factores que Apple declara. El
título, el subtítulo, el campo de keywords, los ratings, el ritmo de descargas y la conversión
de la ficha siguen mandando. Igual que el SEO técnico sigue siendo la base del AEO, el ASO
clásico sigue siendo la base del descubrimiento por IA en tiendas.

---

## 10. Herramientas

- **Primarias:** App Store Connect y Play Console. Son la única medición ●.
- **Terceros:** AppTweak, Sensor Tower, MobileAction, AppFollow, Appfigures. Sus volúmenes y
  rankings son estimaciones ◑. Precios: `seo-aeo-practice/SOURCES.md`.
- **DataForSEO:** la [App Data API](https://docs.dataforseo.com/v3/app_data/overview/) (solo
  por tasks) cubre Google Play y App Store: búsquedas en tienda, listas, ficha, reseñas y
  listados. Labs agrega `bulk_app_metrics`, `keywords_for_app`, `app_competitors` y
  `app_intersection` para ambas tiendas (`dataforseo-operator/references/02-labs.md` §2.4). En App
  Store la lista de ubicaciones incluye CL, CO, MX y PE; la búsqueda en la base de fichas
  (Listings) funciona solo en EE. UU.; la cobertura por país de Google Play no está verificada.
  Costo de referencia: USD 0,0006 por ficha y USD 0,0012 por página de resultados en tienda
  (ver `seo-aeo-practice/SOURCES.md` §8). No asumir que DataForSEO entrega volumen de búsqueda
  dentro de las tiendas.
  🔴 **Greenhouse no la usa hoy.** El allowlist `src/lib/ai/dataforseo-families.ts` no tiene
  familia `app_data`; agregarla requiere familia nueva, migración del CHECK del ledger de gasto
  y test de paridad (skill `dataforseo-operator`). Los endpoints de apps de Labs caerían bajo el
  prefijo `labs` ya permitido, pero eso no está verificado. Hasta resolverlo, **no se promete
  medición ASO en el portal**.
