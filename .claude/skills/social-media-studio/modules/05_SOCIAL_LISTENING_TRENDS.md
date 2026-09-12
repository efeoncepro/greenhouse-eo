# 05 — Social Listening + Trends + Social Search

> **Tesis operativa 2026.** Las redes también son superficies de **búsqueda**,
> **recomendación** y **descubrimiento**, con comportamiento distinto por plataforma, mercado y
> audiencia. A la vez, la conversación pública es una
> fuente de inteligencia en tiempo real. Este módulo cubre **escuchar** (listening + SoV +
> sentiment), **aparecer en búsqueda/recomendación dentro de las redes** (AEO-social),
> entender cuándo esas URLs aparecen también en Google y **surfear tendencias sin quemar
> la marca** (trend-jacking responsable).

> **Nota de borde actualizada.** Esta skill gobierna búsqueda y recomendación *dentro* de la
> plataforma. `seo-aeo` gobierna la aparición de URLs sociales en Google/Search Console y la
> coherencia de entidad, además del AEO por-motor LLM. `content-marketing-studio` decide si la
> pieza pertenece a una Pillar/Cluster Experience. No hay una separación absoluta entre SEO y
> social: una misma URL social puede ser descubrible en ambos sistemas.

Cárgalo cuando trabajes escucha social, share of voice, sentiment, optimización para
búsqueda dentro de las redes, aparición externa de una URL social, trend-jacking o audio trending.

---

## 0. Social Search como puente comercial con SEO/AEO

En el servicio Efeonce, Social Search no es una táctica aislada ni una promesa de ranking universal. Es una capability recurrente que convierte preguntas, lenguaje, temas, entidades y señales de conversación en decisiones editoriales y oportunidades de demanda.

- Social Media es dueño de escucha, preguntas sociales, hooks, formatos, conversación y query coverage dentro de plataformas.
- SEO/AEO es dueño de queries web, páginas, crawl/indexación, entidades, schema y visibilidad en motores de respuesta.
- Ambas lanes comparten un mapa de temas/entidades, `content_id`, evidencias y aprendizajes, pero mantienen scope, pricing y accountability separados.
- Reporta visibilidad como observación controlada, no como ranking universal ni causalidad automática.

Esto materializa el diferenciador: convertir conocimiento y conversación en autoridad y demanda medibles.

## 1. Social listening — qué es y qué monitorear

Listening = monitorear conversación pública para extraer inteligencia (no solo contar
menciones). Qué vigilar:

| Objeto | Qué observas | Para qué |
|---|---|---|
| **Brand mentions** | Menciones directas + indirectas (sin @) + errores de escritura del nombre | Reputación, oportunidades de responder |
| **Sentiment** | Positivo / neutro / negativo alrededor de la marca y temas | Salud de marca, alerta temprana de crisis |
| **Competidores** | Su volumen, sentiment, qué contenido les funciona | Benchmark, gaps, contra-programación |
| **Keywords / temas** | Términos del nicho, dolores del cliente, preguntas frecuentes | Ideas de contenido, demanda latente |
| **Hashtags / audios** | Qué sube, qué se satura | Trend-jacking, timing |
| **Creators / voces** | Quién mueve la conversación del nicho | Sourcing de creadores (ver 06) |

- **Menciones indirectas importan más que las @**: la mayoría del boca-a-boca no te etiqueta.
  Monitorea el nombre suelto, variantes y typos, no solo el handle.
- **Alerta temprana de crisis**: un salto de volumen + caída de sentiment = señal para
  activar el protocolo de crisis (04 §5) antes de que escale.

**Herramientas** `(as-of 2026-07 — reverificar capacidades)`: nativas (búsqueda en cada
red, alertas), Metricool (menciones/analítica de lo conectado), y suites dedicadas
(Brandwatch, Sprout, Talkwalker, Meltwater) para volumen/sentiment/SoV a escala. En el
estudio Efeonce, parte por lo nativo + Metricool y escala a suite solo si el volumen lo
justifica.

## 2. Share of Voice (SoV) social

**SoV = tus menciones / (tus menciones + las de competidores)** en un set y ventana
definidos. Mide cuánta conversación de la categoría es tuya.

- Define el **set de competidores** y la **ventana** (mensual/trimestral) y sé consistente —
  el SoV solo sirve como serie temporal.
- Combínalo con **sentiment**: SoV alto con sentiment negativo no es una victoria.
- **SoV ≠ alcance pagado**: es conversación orgánica/ganada. Repórtalo aparte del reach.
- Úsalo para detectar cuándo un competidor gana narrativa o cuándo un tema del nicho se
  calienta y puedes entrar.

## 3. Social search y recomendación dentro de la plataforma

La gente **busca dentro de la red**: "mejores audífonos", "receta X", "agencia de marketing
en Chile". El algoritmo de búsqueda de cada red indexa **texto, audio y visual**. Optimiza
cada pieza para ser encontrada:

- [ ] **Keyword en los primeros 3 segundos** — hablada y/o en texto en pantalla. El motor y
      el espectador deciden rápido de qué trata.
- [ ] **On-screen text** con el término de búsqueda (los motores leen el texto en pantalla).
- [ ] **Caption con keyword natural** al inicio (no relleno; el término real que la gente
      escribe). Escribe para el buscador humano, no keyword-stuffing.
- [ ] **Alt-text** descriptivo con keyword (accesibilidad + indexación).
- [ ] **Nombre de archivo** descriptivo con keyword antes de subir (señal menor pero gratis).
- [ ] **Hashtags como taxonomía**, no como confeti: 1 amplio + 1 de nicho + 1 de marca,
      alineados al término buscado. El hashtag clasifica el contenido, no lo "viraliza".
- [ ] **Audio hablado claro** — la transcripción automática es índice de búsqueda; si el
      audio es basura, el motor no te lee.
- [ ] **Coincidencia texto↔visual↔audio**: los tres refuerzan el mismo término. La búsqueda
      es **multi-modal** (texto / visual / voz); una pieza que dice, muestra y escribe el
      mismo concepto rankea mejor que una que solo lo dice.

Regla dura: escribe **para que un humano la encuentre buscando**, no para engañar al motor.
El keyword-stuffing y el hashtag-confeti bajan la calidad percibida y no rankean.

### Evidencia nativa por plataforma

- **TikTok Creator Search Insights** permite explorar temas buscados, content gaps y rendimiento
  de publicaciones en búsqueda, según disponibilidad de la cuenta/región.
- **YouTube Search** prioriza relevancia, engagement y calidad; YouTube Analytics separa fuentes
  como Search, Browse, Suggested y Shorts feed para videos, Shorts y lives.
- **Pinterest Trends** muestra tendencias de búsqueda, guardado y shopping; un Pin puede revivir
  horas, meses o años después y Pin Analytics mide saves, clicks y conversiones disponibles.
- **LinkedIn** reporta Search Appearances/keywords de Page y analytics por post para texto,
  imagen, video, artículo, newsletter y otros formatos. No afirmar que Search Appearances mide
  queries por post: su fuente oficial describe la visibilidad de la Page.

## 4. Aparición de piezas sociales en Google

Las piezas sociales también pueden aparecer fuera de su plataforma. Search Console ofrece
**Platform Properties** para Instagram, TikTok, X y YouTube, con despliegue gradual. Reporta
clics, impresiones, CTR y posición de esas cuentas en Google Search y, cuando hay datos,
Discover y News. Esto **no** mide vistas dentro de Instagram/TikTok/X/YouTube.

- Verifica primero si la propiedad está disponible y si la cuenta puede acreditar ownership.
- En Instagram, posts y Reels elegibles de cuentas profesionales públicas pueden aparecer en
  motores externos según las condiciones vigentes de Meta; reverifica elegibilidad antes de
  prometer indexación.
- La aparición en Google no convierte automáticamente una pieza en cluster node. Sigue
  necesitando JTBD propio, valor autónomo, relación con la Pillar, URL/ID estable, owner y medición.
- La URL social puede ser el nodo gobernado; no fabriques una copia web sólo para declarar canon.

## 5. Tres planos que no se deben mezclar

1. **External search:** Google Search/Discover/News, medido con Search Console cuando exista
   Platform Property; ownership `seo-aeo`.
2. **Platform search/recommendation:** consultas, Search/Browse/For You/Suggested, retención,
   saves y descubrimiento nativo; ownership `social-media-studio`.
3. **Downstream progress:** visita, suscripción, uso de tool, diagnóstico, decisión o handoff;
   ownership `growth-marketing-cro` para tracking/atribución.

No sumes impresiones de estos planos: tienen superficies, denominadores y metodologías distintas.

## 6. Trend-jacking RESPONSABLE

Sumarse a una tendencia (audio, formato, meme, conversación) puede multiplicar alcance —
o quemar la marca si calza mal o llegas tarde. Evalúa **antes** de saltar.

**Investiga el trend antes de escribir una línea** (minutos, no horas):
- Lee los posts **textuales** de las marcas que ya se sumaron, no el resumen de alguien.
- Cruza **≥2 fuentes** de medios de marketing (Marketing-Interactive, Social Samosa, ContentGrip,
  PR Week o equivalentes) para saber qué funcionó y qué se criticó.
- Mira **≥10 imágenes reales** del trend (memes de la gente + material oficial): el chiste dominante
  sale de ahí, no de tu intuición.
- **Nunca caracterices el estado o la intención de otra marca**: cita o describe lo que publicó, con su
  tono. Caso real: se escribió «Duolingo está en pánico por su SEO», y era falso. Duolingo publicó
  «oh god oh god my SEO my SEO» como chiste de personaje para **sumarse** al trend.

**¿Este trend calza? (filtro de 5 preguntas)**
1. **Relevancia**: ¿se conecta con lo que la marca hace/cree, o es forzado? Forzado = daño.
2. **Riesgo de marca**: ¿el origen del trend es limpio? (¿controversia, tragedia, política,
   apropiación?). Ante duda de riesgo → **no**.
3. **Ventana**: ¿estás dentro de la ventana de oportunidad? Un trend efímero muere en
   **24–72 h** `(as-of 2026-07 — volátil)`. Publica en horas, máximo al día siguiente, y escalona
   las redes (el canal reactivo primero). Llegar tarde se ve desesperado.
4. **Aporte**: ¿el chiste **lleva el mensaje de la marca**? Falla cuando la referencia cultural es
   decoración alrededor de un claim escrito de antemano (lección de ContentGrip sobre el iPhone Duo).
   Tampoco copies la mecánica que otra marca ya hizo suya en esa conversación: la comparación de precio
   era de Duolingo y el «lo hicimos primero», de Samsung. El clon se castiga.
5. **Costo de producción vs vida útil**: no inviertas 3 días en algo que muere mañana.

**Mecánicas probadas para sumarse a un lanzamiento** (mapa del iPhone Duo, 2026-09; sirve para el próximo):

| Mecánica | Ejemplo | Cuándo te sirve |
|---|---|---|
| Juego con el nombre | Duolingo, dueño natural de «Duo» | solo si el nombre te pertenece de verdad |
| «Lo hicimos primero» | Samsung, Motorola | si tu categoría tuvo el producto antes |
| Tu producto como el objeto del trend | Domino's «Duomino», Heinz UK «Ketchup Duo» (dos sobres) | producto físico o visual que se deja «duplicar» |
| Tensión del oficio en las dos mitades | Canva: lo que pide el cliente vs lo que quieres diseñar | servicios B2B: la tensión que vive tu cliente |
| El formato como metáfora | Durex, Ryanair, KitKat con el pliegue | cuando la forma del objeto ya dice tu mensaje |

**Canal y personaje.**
- Canal-hogar del trend-jack en Efeonce = **Threads + Instagram** (PDR-020). LinkedIn recibe el
  argumento profesional detrás del chiste, no la misma broma con otro caption.
- El personaje de la marca se mantiene aunque el trend empuje a otra cosa: Duolingo rechazó la
  «alianza» que le propuso Samsung y siguió en su personaje.
- Si la pieza tiene manos, objetos o personas fotorrealistas generados con IA, **declárala** (flags por
  red en `efeonce/STUDIO_TOOLING.md`).

**Velocidad vs riesgo**: el trend-jacking vive en la tensión rapidez ↔ seguridad. Ten una
**vía rápida aprobada**: qué categorías de trend puede saltar el CM sin escalar, y cuáles
requieren sign-off. Documéntalo para no perder la ventana pidiendo permiso.

El artefacto operativo es `templates/trend-jack-checklist.md` — úsalo para decidir go/no-go
en minutos y registrar la razón. **Cierra con ese artefacto.** Caso fuente completo (research,
copy rechazado y aprobado, programación por red):
[`2026-09-11-iphone-duo-trendjack.md`](../../../../docs/operations/social/2026-09-11-iphone-duo-trendjack.md).

## 7. Sonido / audio trending

- **El audio es señal de distribución** en TikTok/Reels: usar un sonido en ascenso puede
  darte una ola de alcance mientras dura.
- **Cázalo temprano**: un audio con pocos miles de usos y subiendo > uno ya saturado con
  millones (ya pasó la ola).
- **Sonido original propio**: si tu audio se vuelve usable por otros, cada uso ajeno es
  distribución de marca. Vale invertir en audios propios "remixeable".
- **Derechos**: usa el catálogo nativo de la red (licenciado); audio comercial ajeno puede
  ser silenciado o bajado, sobre todo en cuentas de marca. `(reverificar política por red)`

## 8. Trend efímero vs shift estructural (no confundir)

| | **Trend efímero** | **Shift estructural** |
|---|---|---|
| Vida útil | Horas–semanas | Trimestres–años |
| Ejemplo | Un audio, un meme, un formato de la semana | Social search, long-form volviendo, social commerce |
| Respuesta | Trend-jack táctico (rápido, barato, desechable) | Cambiar estrategia/pilares/inversión |
| Riesgo | Perderlo = poco costo | Ignorarlo = quedar obsoleto |

Regla dura: **no reestructures la estrategia por un trend efímero, ni trates un shift
estructural como moda pasajera.** El listening sirve para distinguirlos: un efímero pico y
baja; un shift sube y se sostiene por trimestres. Confirma la categoría antes de mover
presupuesto o pilares.

## 9. Métricas de listening

- **Volumen de menciones** (serie temporal; el pico importa más que el absoluto).
- **Sentiment** (% pos/neu/neg y su tendencia).
- **Share of Voice** vs set de competidores.
- **Emerging topics/keywords** (qué sube en el nicho).
- **Reach/impresiones de la conversación** (cuánta gente ve lo que se dice de ti).
- **Time-to-detect** de una crisis (cuánto tardas en verla — objetivo: minutos, no días).

## 10. NUNCA (anti-patrones)

- **NUNCA** reduzcas social search a "sólo in-platform": una URL social puede aparecer en Google.
- **NUNCA** mezcles Search Console externo, analytics nativo y progreso downstream en una sola
  cifra de impresiones o "alcance total".
- **NUNCA** hagas keyword-stuffing ni hashtag-confeti: baja calidad y no rankea.
- **NUNCA** saltes a un trend sin pasar el filtro de 5 preguntas — el riesgo de marca es real.
- **NUNCA** atribuyas a otra marca un estado o una intención («está en pánico», «se defiende»): cita
  o describe lo que publicó.
- **NUNCA** reestructures la estrategia por un trend efímero.
- **NUNCA** afirmes cifras de social search de memoria — son `semestrales`, reverifica.
- **NUNCA** uses audio comercial ajeno en cuenta de marca sin verificar derechos.
