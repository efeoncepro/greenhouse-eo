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
o quemar la marca si calza mal o llegas tarde. Evalúa **antes** de saltar:

**¿Este trend calza? (filtro de 5 preguntas)**
1. **Relevancia**: ¿se conecta con lo que la marca hace/cree, o es forzado? Forzado = daño.
2. **Riesgo de marca**: ¿el origen del trend es limpio? (¿controversia, tragedia, política,
   apropiación?). Ante duda de riesgo → **no**.
3. **Ventana**: ¿estás dentro de la ventana de oportunidad? Un trend efímero muere en
   **24–72 h** `(as-of 2026-07 — volátil)`. Llegar tarde se ve desesperado.
4. **Aporte**: ¿agregas un giro propio, o solo copias? El algoritmo y la audiencia premian
   el giro, castigan el clon.
5. **Costo de producción vs vida útil**: no inviertas 3 días en algo que muere mañana.

**Velocidad vs riesgo**: el trend-jacking vive en la tensión rapidez ↔ seguridad. Ten una
**vía rápida aprobada**: qué categorías de trend puede saltar el CM sin escalar, y cuáles
requieren sign-off. Documéntalo para no perder la ventana pidiendo permiso.

El artefacto operativo es `templates/trend-jack-checklist.md` — úsalo para decidir go/no-go
en minutos y registrar la razón. **Cierra con ese artefacto.**

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
- **NUNCA** reestructures la estrategia por un trend efímero.
- **NUNCA** afirmes cifras de social search de memoria — son `semestrales`, reverifica.
- **NUNCA** uses audio comercial ajeno en cuenta de marca sin verificar derechos.
