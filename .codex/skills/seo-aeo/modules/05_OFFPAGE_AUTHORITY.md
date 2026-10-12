# 05 · Off-page / Autoridad (Digital PR + Reddit/UGC)

> Carga para: backlinks, digital PR, brand SERP, menciones sin enlace, y el peso
> creciente de Reddit/foros/UGC y comunidades. Sello: as-of 2026-06; auditoría del
> **motor de enlaces** y regla dura del **claim de producto** as-of 2026-08-25;
> **capilaridad editorial** y **unbrand test que falla legítimamente** as-of 2026-08-25.

## Reconocimiento externo y presencia distribuida

Aplicar `docs/operations/SEO_AEO_CATEGORY_LEADERSHIP_OPERATING_MODEL_V1.md` §4.5. La distribución de
pruebas útiles llega a compradores y permite contrastar claims con referencias independientes. Los
backlinks y las menciones son señales diferentes; no existe una equivalencia universal ni una regla
causal de «menciones → recomendación IA». Investigar fuentes usadas por cada superficie y muestra.

Seleccionar medios, especialistas, partners y comunidades por pertinencia, audiencia y capacidad real.
Una página accesible puede ser candidata a recuperación; no demuestra uso por un motor. No atribuir
aprendizaje/entrenamiento a una publicación ni fabricar consenso. Medir enlaces, contexto, fidelidad y
recomendaciones observadas con sus denominadores, conservando evidencia de negocio por separado.

## Backlinks: calidad sobre cantidad (sigue vigente)

- **Qué pesa:** relevancia temática del dominio, autoridad real, tráfico del
  dominio, contexto del enlace (editorial vs. footer), diversidad de dominios
  referentes. Un enlace editorial relevante > 100 enlaces de directorios.
- **Qué evaluar con Semrush MCP** (`backlink_research`): perfil de referring
  domains, authority score, anchor distribution, toxicidad, gaps vs.
  competidores (de dónde sacan links ellos y tú no).
- **Anchor text:** natural y diverso. Sobre-optimizar anchors exactos = señal de
  manipulación (riesgo, ver `ANTIPATTERNS.md`).
- **Link velocity:** crecimiento orgánico y sostenido; picos antinaturales son
  bandera roja.
- 📐 **Para convertir un link gap en lista de outreach priorizada:** el corte
  `add_me_candidate` (la página ya lista ≥2 competidores, o es *resource page*, o su anchor/URL
  dice *best/top/alternatives/vs/roundup*), la matriz 2×2 **priority × attainability** con umbral
  50/50 y sus glosas (*start here / long game / quick wins si sobra capacidad / skip*), y el dedupe
  en dos capas (eTLD+1 **con excepción para plataformas alojadas** + colapso por subred `/24`
  **con allowlist de CDN**) → `../references/competitor-methodologies-2026-09.md` §4. Fórmulas de
  terceros, **no validadas con nuestros datos**; `ANTIPATTERNS.md` sigue gobernando qué enlace se
  persigue.

### Enlaces tóxicos y disavow — cuándo SÍ y (casi siempre) cuándo NO

Decisión Efeonce 2026-09-11: **no construimos un generador automático de disavow**, y un
"informe de toxicidad" no es por sí solo motivo para entregar uno.

- **Por qué no.** Google descuenta por su cuenta la gran mayoría del spam entrante; el
  disavow existe para el caso en que el propio sitio construyó enlaces manipulativos. Un
  archivo generado por umbral desautoriza enlaces que estaban aportando, y el daño es
  difícil de revertir porque el efecto tarda en reprocesarse. Una herramienta que lo
  produce con un clic invita a usarlo donde no corresponde.
- **Cuándo sí, con juicio humano de por medio:** acción manual confirmada en Search
  Console; historial declarado de compra de enlaces o de una agencia previa que los
  construyó; o un patrón de spam entrante masivo y dirigido que el cliente puede fechar.
  Ninguno de los tres se detecta por un score: los tres se declaran.
- **Si se llega a entregar uno:** desautorizar a nivel `domain:` (no URLs sueltas),
  deduplicar, y verificar los dos topes duros de Google —**menos de 100.000 líneas y menos
  de 2 MB**— antes de entregar. Revisión humana obligatoria línea por dominio; el score de
  spam ordena la revisión, no la reemplaza. Detalle operativo del patrón y sus trampas:
  `.claude/skills/dataforseo-operator/references/03-backlinks.md` §8.1.
- **Lo que sí hacemos con el score de toxicidad:** diagnóstico y priorización de
  *prospección* (qué perfil de enlaces tiene un dominio antes de perseguirlo) y vigilancia
  de un pico de pérdida. Diagnosticar ≠ desautorizar.

## Digital PR (el motor de links + menciones de calidad)

La forma legítima y escalable de ganar autoridad en 2026:
- **Investigación propia:** publicar datos verificables, método y límites que terceros puedan usar;
  estudiar citas recibidas sin garantizar enlaces ni declarar preferencia universal de las IA.
- **Expert commentary** (HARO/Connectively y similares): responder a periodistas
  con quotes expertos → menciones + links en medios de autoridad + construye
  entidad de autor.
- **Newsjacking / tendencias:** aportar ángulo experto a temas del momento.
- **Relaciones reales** con periodistas/creadores del nicho > pitching masivo.
- Resultado: backlinks de autoridad **+** menciones de marca **+** señales de
  entidad, todo de una. El digital PR es donde SEO, AEO y branding convergen.

### Producción del activo enlazable — hand-off canónico

Este módulo diagnostica la oportunidad off-page y mide autoridad; no inventa el activo editorial. Cuando el
objetivo sea que colegas, medios o especialistas compartan, mencionen, enlacen o citen una pieza, cargar el
[`Método de utilidad citable`](../../content-marketing-studio/references/citation-utility-method.md) de
`content-marketing-studio` y completar su `citation-utility-contract` antes del draft.

Regla: **caso real -> objeto reutilizable -> evidencia/límites -> superficie enlazable -> revisión por pares ->
distribución ganada -> medición**. No prometer backlinks y no usar compra, intercambio o outreach masivo como
sustituto de utilidad editorial.

#### El `unbrand test` puede fallar legítimamente — y eso cambia la MEDICIÓN, no el objeto

El método exige que el objeto **siga sirviendo sin logo ni CTA**. **Pero cuando el objeto ES la
entidad de marca** —un léxico propietario, una nomenclatura, un índice con nombre—, quitarle la
marca lo vacía: **el gate falla por construcción**, y no hay nada que arreglar.

La lectura correcta no es «arréglalo», y tampoco marcarlo verde para que cuadre. Es que **la
pieza es construcción de entidad, no utilidad neutra** y, por lo tanto, **se mide por menciones
y citas del léxico, no por backlinks al objeto**; mantener backlinks como evidencia distinta cuando existan.
No trasladar correlaciones de una muestra externa a una regla causal de visibilidad IA. Medir esa pieza por backlinks la declara fracasada mientras cumple su función.

✅ **Declarar el gate fallado y explicar por qué es más honesto y más útil que forzar el
verde.** El objeto no cambia; cambia la métrica de éxito, y eso se escribe en el brief.

### La capa que gana enlaces es la que sólo el cliente puede escribir

Antes de proponer «hagamos contenido enlazable», **audita POR QUÉ gana enlaces la
pieza que los gana**. La pregunta no es *qué formato tiene*, es *qué la hace
irreemplazable*.

**Si los gana por profundidad de fuente primaria** — dato propietario, cifra con
unidad, consejo honesto que **puede frenar la venta** — ese es el motor **replicable**,
porque la materia prima ya está dentro del cliente y nadie más la tiene.

🔴 **Si los gana por músculo que el cliente no tiene, no se copia el motor.** Evento
físico, PR sostenido con redacciones, publicación impresa: replicar eso es prometer un
resultado que depende de una capacidad ausente. Nombra la asimetría en vez de copiarla.

**Regla dura del claim de producto:**

> **Si la ficha no lo declara literalmente, el H2 no se escribe.**

- **NUNCA** rellenes una especificación con lógica de oficio («si es esmalte, entonces
  el brillo será…»). **Una palabra cambia el claim** y el claim es responsabilidad
  legal del cliente, no criterio editorial.
- **NUNCA** completes con la ficha de **otra marca** del mismo segmento.
- Si el dato no está, el H2 queda **condicionado y bloqueante**, con dueño y fecha —
  no se publica a medias ni se sustituye por prosa vaga.

⚠️ **Verifica si el estándar que estás proponiendo es paridad o mejora.** Si la
**edición anterior del propio cliente tampoco tenía esa capa**, no estás tapando un
hueco: estás **subiendo el estándar**. Decirlo cambia la conversación — de «nos falta
algo» a «vamos a hacer algo que no habíamos hecho», y cambia también quién tiene que
aprobar el esfuerzo extra.

## Capilaridad: mide el grafo de enlaces EDITORIALES, no el total

> Medido as-of 2026-08-25 sobre el blog de un cliente. El grafo interno es **precondición de
> autoridad**: sin él, cada pieza nueva rinde menos que arreglar una existente. **Pero el
> conteo bruto miente.**

🔴 **Trampa verificada:** un **módulo global** —pie de página, carrusel de «relacionados», terna
fija de plantilla— inyecta **los mismos destinos en todas las páginas**. Eso **infla el conteo
~2,6×** y **fabrica «hubs» que no existen**.

**Método correcto:** descarta los enlaces que aparecen en **más del 50% de las páginas** (eso
es *chrome*, no editorial) y mide **sólo el cuerpo**.

Medido en el caso fuente: **112 enlaces «totales» → 43 editoriales**; «72% de las piezas sin
entrantes» → **86%**; **tres «sumideros» → uno solo real**, los otros dos eran destinos
cableados en la plantilla.

🎯 **La consecuencia operativa es OPUESTA según el tipo de destino.** A una pieza editorial sin
entradas se le **dan entradas**. A un **destino cableado** en plantilla no se le dan salidas:
**se le quitan las entradas**, reemplazando la terna fija por un **módulo contextual dirigido
por el mapa de clúster**. Confundirlos empeora el grafo mientras el dashboard mejora.

⚠️ **Y mide siempre cuántos enlaces internos apuntan a un soft 404.** Un overhaul de slugs deja
enlaces vivos hacia destinos muertos y nadie lo nota: en el caso fuente, **~16–23% del enlazado
editorial**. Un enlace roto no transfiere nada **y además rompe el encadenamiento del ciclo de
entidad** (`03_EEAT_ENTITY.md`) — la pieza cree estar enlazada y no lo está.

## Brand SERP (lo que sale al buscar tu marca)

La SERP de tu propio nombre es tu "tarjeta de presentación" ante usuarios *y*
modelos. Audítala y contrólala:
- ¿Aparece Knowledge Panel? (→ `03_EEAT_ENTITY.md`)
- ¿Los primeros resultados son propiedades que controlas o reseñas positivas?
- ¿Hay sitelinks? ¿Reseñas/estrellas?
- Gestiona resultados negativos con contenido propio fuerte + reputación.

## Menciones sin enlace (unlinked mentions)

- Detectar referencias, conservar contexto y verificar identidad/capacidad descritas. Un enlace útil
  puede facilitar acceso a pruebas; una mención independiente puede aportar reconocimiento al comprador.
- Medir si las fuentes aparecen en la superficie investigada. Co-ocurrencia no prueba entrenamiento,
  peso algorítmico ni inclusión; la relación con la categoría debe sostenerse en capacidades reales.

## Reddit, foros y UGC — el canal que explotó

**Reddit es la fuente #1 citada por los motores IA** (~1 de cada 5 citas en
Perplexity) y rankea fortísimo en Google desde 2024. **YouTube superó a Reddit**
como plataforma social más citada a inicios de 2026.

Implicaciones accionables:
- **Presencia genuina en comunidades** relevantes (subreddits del nicho, foros,
  Quora, Stack Exchange según el caso). Aportar valor real, no spam — el spam se
  castiga y quema la marca (`ANTIPATTERNS.md`).
- **No puedes controlar Reddit, pero sí participar**: responder con expertise,
  ser citado por la comunidad, monitorear qué se dice de la marca.
- **YouTube como SEO/AEO:** video optimizado (título, descripción, transcript,
  capítulos) es contenido indexable y altamente citado. El transcript es texto
  recuperable.
- **UGC propio:** reseñas, Q&A, foros en tu sitio añaden frescura, long-tail y
  señales de comunidad — si se moderan (UGC sin moderar = riesgo de spam).

## Cómo priorizar off-page (RICE típico)
1. **Alto/medio esfuerzo, alto impacto:** digital PR con data propia (gana links
   + menciones + entidad de una vez). Empezar aquí.
2. **Medio:** expert commentary / HARO (constante, bajo costo, construye autor).
3. **Medio:** presencia genuina en Reddit/comunidades del nicho + YouTube.
4. **Bajo (cuestionar):** link building transaccional, directorios, guest posts
   de baja calidad → bajo ROI y riesgo.

> **Cross-refs:** entidad/Knowledge Graph que esto alimenta → `03_EEAT_ENTITY.md`.
> Por qué las menciones citan en IA → `04_AEO_GEO.md`. Riesgos black-hat de link
> schemes → `ANTIPATTERNS.md`. Medir autoridad/menciones → `07_MEASUREMENT.md`.
