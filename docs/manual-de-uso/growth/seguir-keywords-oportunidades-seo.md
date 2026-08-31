> **Tipo de documento:** Manual de uso (operador del portal)
> **Version:** 1.5
> **Creado:** 2026-08-07 por Claude (TASK-1308)
> **Ultima actualizacion:** 2026-08-28 por Claude (TASK-1792 — el techo de clics declara de donde salio, y la lista avisa cuando no ordena por ganancia)
> **Documentacion tecnica:** [GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md) §7 y §10.4

# Oportunidades de Keywords — Leer el mapa y seguir keywords

## Para que sirve

Responder **que keyword persigo primero** para un cliente, y poner las elegidas bajo seguimiento diario
de posicion. La pantalla vive en `Growth > SEO > Keywords` (`/admin/growth/seo/keywords`).

## Antes de empezar

| Requisito | Como se verifica |
|---|---|
| El Space tiene el modulo SEO asignado | Aparece en el selector de Space. Si no aparece, ver [asignar-modulo-seo-organizacion.md](asignar-modulo-seo-organizacion.md) |
| Search Console conectado y con dias capturados | Si falta, la pantalla lo dice. El boton **Conectar Search Console** aparece solo si ademas tienes la capability `growth.search_console.connect`; si no, veras el aviso sin boton |
| Permiso para ver | Capability `growth.seo.observation.read` |
| Permiso para **seguir** | Capability `growth.seo.target.configure`. Sin ella la columna **Seguimiento** (y las casillas de seleccion) **no se renderiza** — es a proposito |

## Paso a paso

1. Entra a `Comercial > Growth > SEO` (zona Operacion del menu lateral) y abre la tab **Keywords**.
2. Elige el Space en el selector de arriba. El `?space=` de la URL es compartible, pero si el Space no
   tiene el modulo vigente el portal cae al primero elegible — no es un atajo para saltarse el permiso.
3. Elige la **ventana** (28 o 90 dias). Define sobre que periodo se pondero la posicion.
4. Lee primero la **banda de veredicto**: una frase con el hallazgo dominante del conjunto
   (por ejemplo "42 de 50 keywords compiten contra tu propio sitio") y los clics totales que
   estan sobre la mesa.
5. Lee el mapa: **izquierda = mas cerca de la primera plana**, **arriba = mas gente lo busca**,
   **burbuja mas grande = mas clics ganarias**. Si ya sabes que buscas, **Ocultar mapa** lo pliega
   y deja la tabla arriba; **Ver mapa** lo devuelve.
6. Acota si lo necesitas: los tres segmentos de la banda de veredicto **son el filtro por accion**
   (pulsa uno para filtrar, pulsalo de nuevo o usa **Ver todas** para soltarlo); ademas hay
   **Buscar keyword** y el selector **Posicion**. Los filtros son locales: no recargan la pagina,
   pero si viajan en la URL, asi que el enlace se comparte ya filtrado.
7. En la tabla, revisa la keyword, su pagina actual y la ganancia estimada. Si el Space tiene el
   enriquecimiento de mercado, veras ademas **Volumen** y **Barrera de enlaces** (ver "Las dos
   lentes" mas abajo). Viene ordenada por ganancia estimada **cuando ese criterio distingue entre
   filas**, y por demanda medida cuando no (ver "Cuando el techo de clics no puede ordenar la
   lista"); puedes reordenar por cualquier columna numerica y cambiar el tamaño de pagina
   (10 / 25 / 50; por defecto 25).
8. Pulsa **Seguir** en las que quieras medir a diario, o marca varias y usa **Seguir seleccionadas**.
9. Para sacar una del ciclo, **Dejar de seguir**. Tienes unos segundos para **Deshacer**.
10. **Exportar CSV** baja lo que estas viendo, con los filtros aplicados.
11. Un click en la keyword te lleva a **Rendimiento** con su serie aislada. Un click en la URL de
    abajo abre en otra pestaña la pagina que rankea hoy — es la que hay que mirar para consolidar.

## Las dos lentes: lo medido y lo estimado

La pantalla mezcla **dos fuentes que nunca se promedian**. Saber cual estas mirando cambia lo que
puedes afirmarle a un cliente.

| Lente | Que columnas trae | Que es |
|---|---|---|
| **● Medido · Search Console** | Posicion, Impresiones, Clics, CTR, Ganancia est., Paginas | Lo que a **este** sitio le paso de verdad en Google. Es demanda propia, no un promedio |
| **◑ Estimado · mercado** | **Volumen** y **Barrera de enlaces** | Estimacion del mercado (proveedor externo, refresco mensual). Sirve para dimensionar una busqueda donde el cliente todavia no aparece |

Reglas de lectura:

- **No las promedies ni las mezcles en una sola conclusion.** "Tiene 2.400 de volumen" y "te ve 300
  veces al mes" son dos hechos distintos y ambos son ciertos.
- **El volumen estimado no prioriza esta pantalla.** El orden sale siempre de datos medidos: de la
  ganancia estimada cuando el techo puede distinguir entre filas, y de la demanda medida cuando no.
  El volumen ayuda a *explicar* y a dimensionar, no a rankear.
- **Las dos columnas de mercado aparecen solo si el Space tiene el enriquecimiento habilitado.** Si
  no lo tiene, no se renderizan y la pantalla lo declara una vez al pie del mapa. Es a proposito:
  una columna que no puede traer dato no gana su ancho.
- **La cifra tiene fecha.** Se captura por corrida y se refresca mensualmente; la pantalla todavia no
  imprime esa fecha. Si necesitas el "vigente al", mirala en
  [operar-datos-de-mercado-keywords.md](operar-datos-de-mercado-keywords.md).

## Cuando el techo de clics no puede ordenar la lista

La columna **Ganancia est.** responde "cuantos clics ganarias si esta keyword llegara a la
posicion objetivo". Sale de la **curva de CTR de tu propio sitio**: cuanto convierte ESE sitio
en cada posicion. Es mejor que una tabla de industria porque absorbe sola cuanto te esta
deprimiendo el CTR la respuesta con IA en tu vertical.

**Pero esa curva necesita historia.** Un sitio recien conectado, o de trafico bajo, no tiene
suficientes clics en la posicion objetivo para que el numero signifique algo. Y ahi hay una
trampa que ya nos costo: **cero clics no quiere decir "convierte cero", quiere decir "nadie
midio lo suficiente"**. Con 75 impresiones y ningun clic, el CTR real puede ser cualquier cosa
entre 0% y 4%.

Que hace la plataforma cuando eso pasa:

| Situacion | Que numero recibes | Que puedes afirmar |
|---|---|---|
| Hay historia suficiente en la posicion objetivo | Techo calculado con tu propia curva | Es un techo **medido en tu sitio**. Ordena la lista |
| No hay historia ahi, pero si en el sitio en general | Techo con curva de referencia **ajustada al nivel de tu sitio** | Es una aproximacion calibrada. **No ordena la lista** |
| No hay historia suficiente en ninguna parte | Techo con curva de referencia prestada | Es una referencia externa. **No ordena la lista** |

⚠️ El segundo caso —**curva de referencia ajustada al nivel de tu sitio**— esta probado y es
correcto por construccion, pero **todavia no se ha visto ocurrir en produccion**: de las dos
organizaciones con serie real, una mide en la posicion objetivo y la otra no tiene muestra ni para
estimar un nivel. Si te toca, es la primera vez; verificalo antes de explicarselo a un cliente.

⚠️ **La pantalla todavia no te dice en cual de las tres estas.** El veredicto y el tamaño de la
muestra ya viajan en la respuesta del modulo, pero la tabla sigue mostrando "+N clics/mes est." sin
declarar su procedencia; pintarlo en pantalla es trabajo pendiente de la task dueña del render. Lo
que **si** quedo corregido es el **orden**: la lista ya no finge estar ordenada por ganancia cuando
ese criterio no distingue nada.

Mientras tanto, para saber en cual estas sin adivinar: consulta la misma lente por el carril
programatico —`GET /api/platform/ecosystem/growth/seo/keyword-opportunities`, o la consulta
`get_seo_keyword_opportunities` desde un asistente— y mira tres campos de la respuesta:
`ctrCurveSource` (de donde salio el techo), `curveSampleSize` (con cuanta muestra) y `orderedBy`
(con que criterio se ordeno). Son los mismos datos que la pantalla mostrara cuando el render se
actualice.

🔴 **Cuando el techo no puede ordenar, la lista se ordena por demanda medida** — impresiones
reales × que tan cerca esta de la primera plana — y ambos factores salen de Search Console, sin
nada estimado. Es un orden peor informado, pero **es un orden real**. Antes de esta correccion
la lista se ordenaba por un campo que valia cero en todas las filas: no ordenaba mal,
**no ordenaba**, y nada lo avisaba.

⚠️ **El techo NUNCA es un pronostico**, ni siquiera cuando sale de tu propia curva. Dice
"si llegaras a la posicion 5 y ahi convirtieras como convierte tu sitio en la 5, ganarias N
clics". No dice que vayas a llegar. Presentalo como techo al cliente, jamas como proyeccion.

🎯 **Que hacer si tu sitio cae en los dos ultimos casos.** No es un error a reportar: es la
lectura correcta de un sitio joven. Lo accionable es (a) usar el orden por demanda medida, que
sigue siendo valido, y (b) saber que la curva mejora sola a medida que el sitio acumula serie —
no hay nada que configurar.

## Que significan las señales

| Señal | Significado |
|---|---|
| **Empujar (fruta madura)** | Posicion 10 o mejor. Ya estas en primera plana; subir dentro de ella es lo mas barato. En la tabla y en la banda aparece corto: **Empujar** |
| **Empujar (a un paso)** | Posicion 11 a 20. Segunda plana; el salto a primera es el de mayor retorno. Corto: **A un paso** |
| **Consolidar** | Mas de una pagina tuya compite por esa busqueda. **No se optimiza: se consolida.** Es otro trabajo |
| Forma del punto en el mapa | Circulo = Empujar · triangulo = A un paso · rombo = Consolidar. La forma existe para que la lectura no dependa del color; la misma etiqueta esta en texto en la tabla |
| Zona sombreada **"Primera plana"** | Marca las posiciones 8 a 10. Es un **hecho posicional, no una accion**: dentro tambien caen keywords canibalizadas, y esas se consolidan |
| `● Medido · Search Console` | Al pie del mapa, junto al aviso de que el enriquecimiento de mercado no esta habilitado en este Space. Aparece solo en ese caso: significa que **todo** lo que ves salio de la medicion real del sitio |
| **Volumen** | Busquedas mensuales estimadas de esa keyword en el mercado del target (pais + idioma). Es la lente ◑ estimada: **no** es cuanta gente llego a este sitio (eso son las Impresiones) |
| **Barrera de enlaces** | Que tan atrincherado con backlinks esta el top 10 de esa busqueda. Se muestra en niveles — **Baja / Media / Alta** — nunca como numero |
| **Barrera "Baja"** | ⚠️ **No significa "facil".** Significa que ahi **se compite con contenido y autoridad de dominio, no con enlaces**: es una oportunidad para un dominio fuerte. Leerlo como "trivial" es el error clasico |
| **"Sin dato"** en Volumen o Barrera | Esa keyword **no se consulto** al proveedor, o el proveedor **no la tiene**. Es un hueco: no es un cero y **no es "Baja"** — presentar un hueco como barrera baja afirma una oportunidad que nadie midio |
| "+N clics/mes est." | Clics adicionales si llegara a la posicion objetivo. Es un **techo, no un pronostico**. Sale de la curva de CTR **del propio sitio** cuando hay historia suficiente en esa posicion; si no, de una curva de referencia ajustada al nivel del sitio. La pantalla **todavia no dice cual de los dos** — ver "Cuando el techo de clics no puede ordenar la lista" |
| "Sin ganancia estimada" | **Depende del estado de la curva** (ver la seccion de arriba). Si la curva de tu sitio SI mide en la posicion objetivo, significa que esa keyword ya convierte mejor que ese promedio. Si NO mide, significa que **no hubo con que comparar** — y ahi el cero no es un hallazgo, es un hueco. Nunca lo presentes como "ya esta bien" sin mirar de donde salio el techo |
| "X de 200 keywords seguidas" | El cupo del set monitoreado. Cada keyword vigente se cobra en cada ciclo diario |
| **Dejar de seguir** | Ya esta en el set. Pulsalo para sacarla del ciclo diario y liberar cupo |
| **Paginas** | Cuantas paginas tuyas aparecen para esa busqueda. Mas de una = compiten entre si, y ese numero decide la urgencia de consolidar |
| "Datos hasta AAAA-MM-DD" | Hasta que dia llega la serie medida. Search Console no publica el dia anterior y ajusta ~48h |
| "N fuera del filtro actual" | Habias seleccionado keywords que el filtro vigente ya no muestra. **No entran en el lote**: seguir algo que no tienes delante compromete gasto sin haberlo revisado |
| "Seguiste N de M keywords" | Resultado del lote. Si N < M, las que faltan rebotaron (techo o error); no es un "listo" generico |

## Dejar de seguir: que pasa exactamente

- **No borra nada.** La medicion historica se conserva; lo que se cierra es la ventana de
  seguimiento. La keyword deja de consumir presupuesto desde el proximo ciclo.
- **Se puede volver a seguir.** Empieza una ventana NUEVA: los dias que estuvo fuera **no se
  recuperan** y quedan como un hueco permanente en su serie.
- **Por eso no sirve para "pausar".** Si piensas reanudarla pronto, dejarla seguida cuesta
  menos que perder la continuidad de la medicion.
- Funciona aunque el sitio este pausado: bloquear la salida congelaria el gasto sin forma de
  bajarlo.

## Objetivo u oportunidad: por que la keyword esta en el set

Desde 2026-08-14 cada keyword del set puede declarar **por que** esta ahi. Son dos cosas
distintas y el sistema ya no las confunde:

| Intencion | Que significa | Como se lee su posicion |
|---|---|---|
| **Oportunidad** | demanda que tu sitio YA capta y estas empujando | estar en la 12 y querer la 5 |
| **Objetivo** | un compromiso acordado con el cliente | estar en la 60 puede ser normal: es la distancia que falta, no un fracaso |

Tres cosas que conviene saber:

- **"Seguir" desde esta pantalla declara `oportunidad`**, porque eso es exactamente lo que estas
  haciendo: mirar demanda medida y decidir empujarla. Declarar un **objetivo** es otra accion, con
  su propia superficie.
- **Las keywords que ya estaban seguidas antes de esta fecha no tienen intencion declarada**, y
  aparecen asi: sin dato. No se las marco como oportunidad automaticamente — nadie las clasifico,
  y decir lo contrario habria inflado el conteo de oportunidades con filas que nadie miro.
- **Cambiar la intencion de una keyword no borra su historia.** Queda registrado desde cuando es
  objetivo, para poder decir despues *"es objetivo desde marzo, y en marzo estaba en la 45"*. Y no
  consume cupo del techo: se puede reclasificar aunque el set este lleno.

## Que NO hacer

- **No sigas keywords "por si acaso".** Cada una entra al ciclo diario de captura y se le paga al
  proveedor por consulta, todos los dias, hasta que alguien la deje de seguir. El costo no es del clic:
  es recurrente.
- **No leas un objetivo en la posicion 60 como un problema de rendimiento.** Si alguien lo declaro
  como compromiso, esa distancia es el trabajo pendiente. Promediarlo con las oportunidades ensucia
  cualquier lectura agregada.
- **No trates una keyword canibalizada como una oportunidad mas.** Empujarla es empujar dos paginas tuyas
  a competir mas fuerte entre si. Primero se consolida.
- **No leas un "Sin dato" como "0 busquedas".** Significa que esa keyword no se consulto al proveedor.
  Y si las columnas de mercado no aparecen del todo, es que el Space no tiene el enriquecimiento
  habilitado — tampoco es un cero. La priorizacion de esta pantalla no las necesita.
- **No le digas a un cliente que una keyword con barrera "Baja" es facil.** Baja es barrera de
  **enlaces**: dice que no hace falta una campaña de linkbuilding, no que rankear sea gratis. El
  trabajo sigue siendo contenido y autoridad.
- **No mezcles volumen de mercado con impresiones en la misma frase.** Uno es estimacion del mercado
  y el otro es medicion de este sitio; promediarlos o presentarlos como la misma cifra produce una
  conclusion falsa con dos datos verdaderos.
- **No pidas que el mapa use volumen de mercado en el eje.** Es una decision de metodo, no una limitacion:
  la demanda de Search Console es del propio cliente y es mejor insumo que un promedio de mercado.
- **No selecciones en lote y despues filtres.** Lo que queda fuera del filtro **no se sigue** y la
  pantalla te lo dice; no asumas que "Seguir seleccionadas" incluyo lo que marcaste antes.

## Problemas comunes

| Sintoma | Causa probable | Que hacer |
|---|---|---|
| No aparece la columna **Seguimiento** ni las casillas de seleccion | Te falta `growth.seo.target.configure` | Pidele a un admin la capability. No es un bug: ver el mapa y comprometer gasto son dos permisos |
| "Todavia no hay oportunidades" | Ninguna keyword esta hoy entre 8 y 20 con demanda suficiente | Es un estado valido. Revisa mas adelante |
| "Falta conectar Search Console" | El Space no tiene la propiedad conectada | [conectar-search-console.md](conectar-search-console.md) |
| "Todavia no hay dias medidos" | La conexion esta lista pero la primera captura aun no corrio | Vuelve en unas horas. No hay nada que reintentar |
| "Este Space no tiene un sitio SEO configurado" | Falta crear el target del sitio | **No hay boton de reintentar a proposito**: reintentar no lo resuelve. Pideselo a quien administre el modulo |
| "No pudimos cargar las oportunidades" | Fallo temporal de lectura | Usa **Reintentar**. Si persiste, revisa `/admin/operations` |
| El boton "Seguir" esta deshabilitado en todas | El set llego a su tope | Pulsa **Dejar de seguir** en alguna que ya no necesites medir; el cupo se libera al instante |
| "No se pudo seguir: el set llego a su tope" | El techo se evaluo al momento del clic | Lo mismo. El rechazo es explicito a proposito |
| La keyword seguida no aparece en Rendimiento | La primera medicion aun no corrio | El cron de captura corre a las 05:00 CLT. Vuelve al dia siguiente |
| La lista **no parece ordenada por ganancia**: las de arriba no son las de mayor "+N clics/mes est." | El techo de clics no distingue entre filas —el sitio no tiene historia suficiente en la posicion objetivo, o todas las keywords ya convierten mejor que ella— asi que la lente ordeno por **demanda medida** | **No es un bug ni hay nada que configurar.** Es la lectura correcta de un sitio joven o de un conjunto parejo, y el orden por demanda medida sigue siendo valido. Confirma cual fue el criterio en el campo `orderedBy` del carril programatico. La curva mejora sola al acumular serie: ver "Cuando el techo de clics no puede ordenar la lista" |
| Todas las keywords muestran una ganancia estimada muy parecida | Mismo caso: el techo salio de una curva de referencia, no de la historia del propio sitio | Igual que arriba. **No presentes esa cifra al cliente como pronostico** — es un techo prestado, y decirlo protege la conversacion |

## Operar el techo del set

El tope por sitio se controla con la variable `GROWTH_SEO_TRACKED_KEYWORDS_PER_TARGET` (default **200**).
Es un freno de gasto, no una preferencia: subirlo multiplica el costo diario del proveedor por cada
keyword agregada. Subirlo requiere revisar el budget del tier de la organizacion
(`resolveSeoEntitlement`) antes, no despues.

## Referencias tecnicas

- Commands: `src/lib/growth/seo/track-keywords.ts` — `trackKeywords` (techo, entitlement,
  idempotencia, outbox) y `untrackKeywords` (cierre append-only con `clock_timestamp()`)
- Reader: `src/lib/growth/seo/keyword-opportunities-reader.ts` (striking-distance medido; devuelve
  `market: 'available' | 'unavailable'`, que es lo que decide si las dos columnas de mercado se
  renderizan)
- Curva de CTR y veredicto de usabilidad: `src/lib/growth/seo/ctr-curve.ts` (TASK-1792). La
  respuesta de la lente transporta `ctrCurveSource` (`org_measured` · `org_level_reference_shape` ·
  `unusable` · `fallback`), `curveSampleSize` (`{impressions, clicks}`, o `null` si esa posicion
  nunca se observo), `targetPosition`, `expectedCtrAtTarget` y `orderedBy`
  (`estimated_click_gain` · `measured_demand`). Son campos del **conjunto**, no de cada keyword.
  ⚠️ La curva se calcula hoy **incluyendo busquedas de marca**, que inflan las primeras posiciones:
  es un sesgo declarado con follow-up propio, no un dato limpio
- Lente estimada: `src/lib/growth/seo/keyword-market-data.ts` (volumen, `capturedAt` y
  `deriveLinkBarrier` — el nivel de barrera se deriva del perfil de enlaces REAL del top-10
  (diversidad de dominios referentes + page rank), **no** del `keyword_difficulty` crudo del
  proveedor, que en SERPs LATAM colapsa a 0) · captura y costos en
  [operar-datos-de-mercado-keywords.md](operar-datos-de-mercado-keywords.md) · señal de frescura
  `seo.market_data.freshness` en `/admin/operations`
- Contrato programatico: `POST /api/admin/growth/seo/keywords/{track,untrack}` (la puerta que usa
  la pantalla) · lane ecosystem `POST /api/platform/ecosystem/growth/seo/keywords/{track,untrack}`,
  solo desde bindings de scope `internal` · MCP tools `track_seo_keywords` y `untrack_seo_keywords`
  en el MCP interno (`src/mcp/greenhouse/server.ts`)
- ⚠️ **Las dos tools MCP ya estan registradas en el gateway** (`efeonce-mcp`, allowlist de paridad
  el allowlist de federación del gateway, cuyo inventario se deriva del manifiesto `src/mcp/greenhouse/tool-manifest.ts`), pero **siguen sin poder usarse desde un cliente externo**:
  comparten el scope de escritura `efeonce.mcp.seo.write`, que **[verificar]** no esta cableado a
  ningun cliente con grant controlable. Hasta entonces responden `insufficient_scope` — es
  fail-closed por diseño, no una falla. Seguir y dejar de seguir se operan desde el portal
- Evento: `growth.seo.keyword_set.updated` ([catalogo](../../architecture/GREENHOUSE_EVENT_CATALOG_V1.md))
