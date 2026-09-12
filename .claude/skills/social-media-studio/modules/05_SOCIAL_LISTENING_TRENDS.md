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

- **Cubrir menciones directas e indirectas:** buscar nombre, variantes y errores además del handle.
  No afirmar cuál pesa más sin datos de la cuenta/categoría; las conversaciones privadas pueden no ser observables.
- **Alerta temprana de crisis:** un cambio de volumen o tono motiva revisar ejemplos, contexto y método
  de clasificación antes de activar el protocolo (04 §5). Sarcasmo, duplicados y cobertura parcial pueden
  distorsionar sentiment; no declarar crisis desde una métrica aislada.

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

Preparar contenido comprensible para consultas relevantes de la audiencia y verificar qué señales y
métricas documenta actualmente cada plataforma, mercado y tipo de cuenta. No asumir que todas indexan las
mismas capas ni trasladar resultados de TikTok a LinkedIn o Instagram.

- Expresar pronto el tema cuando ayude a comprenderlo; «primeros tres segundos» es una posible decisión
  creativa, no umbral universal de ranking ni requisito de todo post.
- Usar texto en pantalla y caption natural cuando aporten claridad. No forzar keyword en una pieza cuyo
  mecanismo depende de revelación o doble sentido. Priorizar propósito editorial sobre checklist SEO.
- Alt-text describe el contenido para accesibilidad. Incluir términos pertinentes sólo si forman parte
  de la descripción; no prometer que el alt-text mejora ranking en todas las redes.
- Nombre de archivo descriptivo sirve a organización. No presentarlo como señal algorítmica sin fuente
  vigente del canal.
- Hashtags pertinentes cuando tengan función de clasificación/discovery; cantidad y utilidad se deciden
  con evidencia del canal, no fórmula fija «1 amplio + 1 nicho + 1 marca».
- Audio claro, transcripción y subtítulos ayudan comprensión/acceso cuando corresponden. Verificar qué
  utiliza el buscador; no prometer indexación universal por audio ni obligar sonido a un estático.
- Coherencia entre texto/imagen/audio evita confusión. Complementariedad es válida: no deben repetir lo
  mismo para supuestamente rankear mejor. No afirmar efectos de ranking sin evidencia.

Keyword stuffing perjudica claridad; evitarlo por esa razón sin inventar penalizaciones universales.

### Pistas de verificación nativa por plataforma

Las siguientes referencias son rutas de consulta, no disponibilidad live certificada. Antes de afirmar o
operar la capacidad, verificar documentación oficial y cuenta/región con fecha de consulta. Si falta, declarar
no verificado y no prometer ese reporte.

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

Las piezas sociales también pueden aparecer fuera de su plataforma. Verificar en documentación oficial y cuenta si Search Console dispone de
**Platform Properties** para la red solicitada; no dar disponibilidad por confirmada desde esta skill. Si
la propiedad está disponible, comprobar exactamente qué métricas expone antes de reportar
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

Para convertir la oportunidad en una pieza, cargar
[`11_TRENDJACKING_CREATIVE_PRODUCTION.md`](11_TRENDJACKING_CREATIVE_PRODUCTION.md): idea propia,
layout antes del plate, producción por delta y revisión del master. Una seasonality usa ese oficio, pero
no se declara trend activo sin evidencia de conversación.

El canon de clasificación, evidencia y decisiones es
[social-opportunity-playbook.md](../references/social-opportunity-playbook.md), §§1–4. Seasonality es
una ventana previsible; una efeméride no obliga a producir; meme es lenguaje; tiempo real es capacidad;
newsjacking es intervención ligada a una noticia. Una misma pieza puede tener dos capas, que se registran.

**Research antes de escribir o generar:**
- Leer el detonante original y ejemplos nativos completos. Registrar URL, autor, publicación, consulta,
  mercado y qué demuestra cada ejemplo. Describir lo publicado; no atribuir estados mentales a terceros.
- Buscar cobertura diversa; ≥10 piezas es un objetivo de cobertura cuando existen, nunca cuota obligatoria
  ni permiso para inventar muestras. Prensa es contexto adicional, no sustituto del origen ni condición
  necesaria para reconocer una conversación temprana. Su comentario no prueba desempeño sin datos.
- Registrar código repetido, variaciones, audiencia, participantes y aporte posible. Diferenciar hechos,
  interpretación y propuesta. Un chiste no es necesariamente una declaración literal de su autor.
- Una captura permite describir estado puntual; evolución requiere observaciones comparables. Volumen
  acumulado no prueba aceleración. Si falta serie, registrar «evolución no verificada».
- Definir hora de revalidación y condición de retiro. No imponer duración universal ni exigir que todo
  se haga hoy. La producción debe caber en la ventana defendible del caso.

**Decisión antes de render:** audiencia pertinente + relación de marca + aporte propio + viabilidad +
premisa verificada. `go` permite producir; `revise` nombra defecto/corrección; `no-go` explica por qué la
premisa, ventana o requisito esencial impide continuar. No convertir cualquier incertidumbre en prohibición;
resolver lo comprobable y escalar sólo lo que realmente requiere decisión del operador. Publicación necesita
autorización vigente. Revalidar conversación antes de distribuir, aunque la pieza ya esté terminada.

**Mecánicas documentadas en un caso de lanzamiento; no garantías transferibles** (mapa del iPhone Duo, 2026-09; sirve para el próximo):

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

El audio es un código creativo potencial, no un atajo garantizado de distribución. Verificar uso actual,
significado, pertinencia de audiencia y disponibilidad para la cuenta. Pocos usos no prueban ascenso; muchos
no prueban saturación. Observar evolución y variaciones cuando sea posible, con las mismas limitaciones de §6.

Un audio propio puede invitar a participación si tiene una función reutilizable; esa es una hipótesis a probar.
No afirmar que cada reproducción o reutilización atribuye marca. Verificar derechos para uso comercial,
territorio, cuenta, plataforma y derivaciones; estar en un catálogo no autoriza automáticamente toda campaña
ni republicación fuera de esa red. Componer con la skill de derechos y tooling vigente para disclosure aplicable.

## 8. Trend efímero vs shift estructural (no confundir)

| | **Trend efímero** | **Shift estructural** |
|---|---|---|
| Persistencia | Dependencia de un detonante/código; duración observada | Cambio sostenido en comportamientos, no sólo conversación |
| Ejemplo hipotético | Conversación concentrada alrededor de un acontecimiento | Cambio repetido de hábitos de búsqueda/compra, si la evidencia lo sostiene |
| Respuesta | Intervención proporcional a ventana y objetivo | Evaluar cambio estratégico con evidencia y ownership |
| Evaluación | Costo de oportunidad según objetivo, no urgencia automática | Impacto por audiencia/categoría, no obsolescencia presunta |

Regla dura: **no reestructures la estrategia por un trend efímero, ni trates un shift
estructural como moda pasajera.** El listening sirve para distinguirlos: un pico aislado no demuestra
cambio estructural; buscar persistencia, comportamiento y fuentes independientes. Confirmar alcance y
confianza antes de proponer cambios de presupuesto o pilares.

## 9. Métricas de listening

- **Volumen de menciones** (serie temporal; el pico importa más que el absoluto).
- **Sentiment** (% pos/neu/neg y su tendencia).
- **Share of Voice** vs set de competidores.
- **Emerging topics/keywords** (qué sube en el nicho).
- **Reach/impresiones disponibles**: indicar si observados o estimados y cobertura; no sumar audiencias
  solapadas ni presentar la muestra pública como toda la conversación.
- **Time-to-detect**: tiempo desde un evento observable hasta detección, con SLA realmente acordado;
  no prometer monitoreo continuo si no está incluido.

## 10. NUNCA (anti-patrones)

- **NUNCA** reduzcas social search a "sólo in-platform": una URL social puede aparecer en Google.
- **NUNCA** mezcles Search Console externo, analytics nativo y progreso downstream en una sola
  cifra de impresiones o "alcance total".
- **NUNCA** hagas keyword-stuffing ni agregues hashtags sin función; no inventes efectos de ranking.
- **NUNCA** saltes a un trend sin documentar evidencia, elegibilidad y decisión de §6.
- **NUNCA** atribuyas a otra marca un estado o una intención («está en pánico», «se defiende»): cita
  o describe lo que publicó.
- **NUNCA** reestructures la estrategia por un trend efímero.
- **NUNCA** afirmes cifras de social search de memoria — son `semestrales`, reverifica.
- **NUNCA** uses audio comercial ajeno en cuenta de marca sin verificar derechos.
