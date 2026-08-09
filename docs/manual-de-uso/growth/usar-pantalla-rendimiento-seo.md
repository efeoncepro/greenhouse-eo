> **Tipo de documento:** Manual de uso (operador del portal)
> **Version:** 1.0
> **Creado:** 2026-08-07 por Claude (TASK-1307)
> **Ultima actualizacion:** 2026-08-07 por Claude (TASK-1307 — verificado contra la pantalla construida: grupos, lectura del periodo, marcadores de AI Overview, granularidad, bandas de updates y leyenda de fuentes)
> **Documentacion funcional:** [modulo-seo-search-visibility-360.md](../../documentation/growth/modulo-seo-search-visibility-360.md)

# Rendimiento — Ver cómo evoluciona en el tiempo lo que elegiste

## Para qué sirve

Responder **qué pasó con estas páginas o estas búsquedas en el último tiempo, y por qué**.

Es la pestaña **Rendimiento** de Search Visibility. Tú armas la comparación —hasta 8 URLs o
keywords— y la pantalla te muestra las cuatro cifras del período (Posición, Clics, Impresiones,
CTR) contra el período anterior, la película de cómo se movieron, y el detalle elemento por
elemento con la posibilidad de entrar a cada uno.

Es la pantalla que usas cuando ya sabes **qué** mirar. Si todavía estás decidiendo qué atender,
parte por el [cockpit Resumen](usar-cockpit-seo-overview.md).

## Antes de empezar

| Requisito | Cómo se verifica |
|---|---|
| El Space tiene el módulo SEO asignado | Aparece en el selector de Space. Si no aparece, ver [asignar-modulo-seo-organizacion.md](asignar-modulo-seo-organizacion.md) |
| Permiso para ver | Si no lo tienes, la pantalla dice "No tienes acceso al módulo SEO" y no ofrece reintentar: la causa no se resuelve reintentando |
| Search Console conectado | Sin la conexión no hay historia que mostrar. Ver [conectar-search-console.md](conectar-search-console.md) |
| Al menos un día capturado | Si la conexión está viva pero la captura diaria todavía no guardó ningún día, la pantalla lo dice con esas palabras |

Dos cosas que conviene tener claras antes de leer un número:

- **La posición funciona al revés**: menos es mejor. Pasar de 8 a 3 es una mejora, y en el
  gráfico se ve **subiendo** (el eje está invertido a propósito, como en cualquier rank tracker).
- **Un período largo no garantiza una serie larga.** Si una keyword empezó a seguirse hace
  cinco días, pedir 90 días no inventa los otros 85. La pantalla te dice cuántos días del
  período pedido tienen medición real.

## Paso a paso

1. Entra por **Growth → SEO** y abre la pestaña **Rendimiento**.

2. **Fija el alcance en la cabecera.** Space, **Período** y **Dispositivo** viven arriba y
   aplican a todo lo que veas debajo.
   - Período: **Últimos 28 días**, **Últimos 90 días**, **Últimos 180 días** o **Últimos 12 meses**.
   - Dispositivo: **Escritorio**, **Móvil** o **Tablet**. Ojo con esto: no es una preferencia de
     presentación. La búsqueda en móvil y en escritorio devuelve resultados distintos, así que
     cambiar el dispositivo cambia **qué se consultó**, no cómo se dibuja.
   - Junto a esos controles está el corte de frescura: **"Datos hasta …"**. Si dice que no hay
     fecha de corte disponible, todavía no se materializó ningún día.

3. **Arma qué comparar**, en la card **Qué comparar**:
   - Elige **Comparar por: URL** o **Keyword**.
   - Elige la **Métrica** que quieres ver en el gráfico: Posición, Clics, Impresiones o CTR.
   - Agrega elementos en el buscador. Al comparar keywords verás cuáles tienen **Con
     seguimiento** (esas tienen serie de posición exacta); al comparar URLs verás cuántas
     impresiones acumuló cada una en el período.
   - Puedes comparar **hasta 8 a la vez**. Al llegar al tope, la pantalla te pide quitar uno
     antes de agregar otro.

4. **Usa tus grupos si los hay.** Cuando comparas por **Keyword**, y el equipo ya configuró
   grupos de keywords en el seguimiento de ese Space, aparecen bajo **Tus grupos** como botones
   con el nombre y el número de keywords. Un clic arma la comparación completa con ese grupo.
   - No son grupos que el sistema haya inventado: son exactamente los que alguien configuró.
   - Si un grupo tiene más de 8 keywords, el botón lo advierte y se comparan las primeras 8.
   - El botón del grupo que estás viendo se marca relleno.

5. **Lee primero la banda de cuatro indicadores.** Cada uno trae su variación **vs período
   anterior**. En Posición, una baja del número es una mejora.

6. **Lee el recuadro "Lectura del período"**, cuando aparezca. Interpreta los cuatro
   indicadores **juntos** y dice qué explica el movimiento. Sólo puede decir una de cuatro cosas:

   | Lo que dice, en corto | Qué significa para el cliente |
   |---|---|
   | Cayó la **demanda**, no tu ranking | Clics e impresiones bajan juntos con la posición estable: hay menos gente buscando eso |
   | El buscador está **capturando el clic** | La posición y las impresiones se mantienen, pero el CTR cae: algo en la página de resultados (típicamente una respuesta con IA) se queda con el clic antes de llegar a tu resultado |
   | La **mejora de posición** explica el alza de clics | Subiste y se notó |
   | La **pérdida de posición** explica la caída de clics | Bajaste y se notó |

   **Si no aparece, no es un error.** Cuando las señales están mezcladas —o cuando todavía no
   hay período anterior con el cual comparar— la pantalla se calla a propósito: un diagnóstico
   ambiguo es peor que ninguno.

7. **Mira el gráfico de evolución.** Debajo del título te dice cuántos días del período pedido
   tienen medición y entre qué fechas. Ahí mismo tienes:
   - **Granularidad: Diario / Semanal.** Cambia el detalle de la línea. En rangos largos arranca
     en **Semanal** porque un punto por día se vuelve una nube ilegible; vuelve a **Diario**
     cuando necesites el detalle fino. En semanal, los volúmenes se suman y la posición y el CTR
     promedian sólo los días que tienen medición.
   - **Zoom**: arrastra bajo el gráfico para acercarte a un tramo.
   - La línea de referencia **Meta: top 3**, cuando miras posición.
   - **Ver tabla de datos**, si prefieres los valores exactos por fecha en vez de la línea.

8. **Usa el contexto que el gráfico dibuja encima**:
   - **Rombos de AI Overview** — marcan los días en que la búsqueda mostró una respuesta con IA.
   - **Bandas de color de updates de Google** — franjas verticales que marcan una actualización
     **confirmada** del algoritmo, con su nombre.
   - La **leyenda de fuentes** (● Medido · Search Console y ◑ Estimado · DataForSEO) vive junto
     al gráfico, al lado de las series que describe.

9. **Baja a la tabla de detalle.** Una fila por elemento comparado, con su última posición, el
   cambio a 30 días, clics, impresiones, CTR y una mini-tendencia. Puedes ordenar por cualquier
   columna. **Haz clic en una fila para entrar al detalle de ese elemento.**

10. **Comparte el enlace si quieres.** Lo que elegiste viaja en la dirección de la página: quien
    abra ese enlace —y tenga acceso— verá exactamente la misma comparación.

## Qué significan los estados y señales

### Las dos fuentes: ● Medido y ◑ Estimado

Son **dos mediciones distintas de la misma realidad**, y la pantalla nunca las promedia entre sí.

| Señal | Qué es | Cómo usarla |
|---|---|---|
| **● Medido · Search Console** | Lo que Google registró **de tu sitio**: posición promedio, clics e impresiones reales | Es lo confiable para comprometer con el cliente. Es un **promedio**, no la posición de un día puntual |
| **◑ Estimado · DataForSEO** | La posición **exacta** observada en la búsqueda por un proveedor externo | Sirve para ver el ranking fino y el contexto del resultado. Es una observación de mercado, no un registro de tu sitio |

Si una keyword tiene seguimiento reciente, su serie exacta puede ser más joven que la medida. En
ese caso la pantalla sirve la medida y lo declara. Nunca mezcla las dos en una sola línea.

### Cobertura, huecos y "Pendiente"

| Lo que ves | Qué significa | Qué hacer |
|---|---|---|
| "N de M días con medición · desde–hasta" | El período que pediste y los días realmente medidos casi nunca coinciden. Aquí se declara la diferencia | Si N es chico, la tendencia todavía no es legible: no la interpretes como si lo fuera |
| "Una sola medición" | Hay un solo día capturado. Todavía no hay evolución que mostrar | Esperar. La serie empieza a formarse con el próximo día capturado |
| "Serie recién iniciada" | Pocos días medidos dentro del período | Igual: es una serie que empieza, no un gráfico roto |
| Un **hueco** en la línea | Ese día no se midió | Nada. Un día sin medición se dibuja como hueco; jamás como cero |
| **Pendiente** en una celda | Ese dato no existe todavía | No lo leas como cero. Cero es una medición; Pendiente es la ausencia de una |
| **Sin comparación** | No hay una medición de hace 30 días con la cual comparar | Esperar a acumular histórico |
| "Mostramos lo que sí está medido" | Uno o más elementos no tienen datos en el período y quedan fuera del gráfico | Es degradación honesta: quedan fuera en vez de aparecer en cero |

### Rombos de AI Overview

Marcan los días en que la búsqueda mostró una respuesta generada con IA.

**Sólo aparecen cuando la serie viene de la medición del proveedor externo (◑ Estimado), que es
la que observa la página de resultados.** Search Console **no informa ese dato**. Por lo tanto:

> La ausencia de rombos **no** significa que no hubo respuestas con IA. Significa que **esa
> fuente no lo mide**.

Esto importa especialmente cuando el recuadro de lectura del período dice que el buscador está
capturando el clic: la señal de CTR y los rombos son evidencias distintas, y la falta de rombos
no desmiente la caída de CTR.

### Bandas de actualizaciones de Google

Son franjas de color sobre el gráfico con el nombre de la actualización.

Sirven para una sola cosa: **distinguir "se movió todo el mercado" de "se movió mi sitio"**. Si
la caída de posición ocurre dentro de una banda, la primera hipótesis es el mercado, no tu
página.

Sólo se registran **actualizaciones confirmadas por Google**. No aparecen rumores ni "algo se
movió" de terceros: pintar un rumor sobre el gráfico de un cliente sería fabricar contexto. El
registro se mantiene a mano y de forma deliberada, así que puede faltar una actualización muy
reciente.

## Qué no hacer

- **No compares más de 8 elementos.** No es un capricho del tope: con más líneas el gráfico deja
  de ser legible y la comparación pierde el sentido que la justifica.
- **No leas la ausencia de rombos como ausencia de IA.** Sólo la fuente estimada mide ese dato;
  Search Console no. Ausencia de rombos = esa fuente no lo mide.
- **No promedies mentalmente las dos fuentes.** "Medido dice 6,4 y estimado dice 4, entonces
  está en 5" es una cifra que no existe. Son dos mediciones distintas; se citan por separado,
  cada una con su nombre.
- **No interpretes un hueco como una caída a cero.** El hueco es "no se midió". La posición 0 no
  existe, y "0 clics" afirmaría algo que nadie midió.
- **No le atribuyas al sitio un movimiento que cae dentro de una banda de actualización
  confirmada** sin revisar antes cómo se movió el resto del mercado. Puede que el sitio no haya
  hecho nada.
- **No cambies el dispositivo pensando que es un filtro de vista.** Cambia la búsqueda que se
  consultó: los números de móvil y escritorio no son el mismo dato presentado distinto.
- **No presentes una tendencia de una serie recién iniciada.** Si la cobertura dice pocos días
  medidos, la línea todavía no cuenta una película.

## Problemas comunes

| Síntoma | Causa probable | Solución |
|---|---|---|
| "Conecta Search Console para ver el rendimiento" | El Space no tiene la conexión hecha | Seguir [conectar-search-console.md](conectar-search-console.md) |
| "Aún no hay días guardados" | Conexión activa, pero la captura diaria todavía no guardó ningún día | Esperar la corrida diaria o revisar la captura en [operar-serie-search-console.md](operar-serie-search-console.md) |
| "Elige qué comparar" | Todavía no agregaste ningún elemento | Es el estado inicial normal, no un error: agrega URLs o keywords |
| "Sin datos para esta selección" | Nada medido para esos elementos en ese período/dispositivo | Ampliar el período, cambiar el dispositivo o elegir otros elementos |
| No aparece **Tus grupos** | Estás comparando por URL, o el Space no tiene grupos configurados | Cambiar a **Keyword**; si aun así no aparecen, hay que configurar el grupo en el seguimiento |
| No aparece el recuadro "Lectura del período" | Las señales están mezcladas, o no hay período anterior comparable | Es el comportamiento correcto. No hay nada que arreglar |
| Ninguna serie muestra rombos de AI Overview | Las series que estás viendo son las medidas por Search Console | Comparar keywords con seguimiento activo, cuya serie exacta sí observa la página de resultados |
| El gráfico arrancó en Semanal y quiero el día a día | Comportamiento por defecto en rangos con muchos días medidos | Cambiar **Granularidad** a **Diario** |
| "No tienes acceso al módulo SEO" | Falta el permiso, o el Space no tiene el módulo | Pedir el grant o asignar el módulo al Space |
| "No pudimos cargar la evolución" | Falla temporal | Reintentar en unos minutos |

## Referencias técnicas

- Documentación funcional: [modulo-seo-search-visibility-360.md](../../documentation/growth/modulo-seo-search-visibility-360.md)
- Arquitectura: `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md`
- Ruta: `src/app/(dashboard)/admin/growth/seo/performance/page.tsx`
- Vista: `src/views/greenhouse/admin/growth/seo/performance/**`
- Lectores y lectura cruzada: `src/lib/growth/seo/performance/**`
- Registro de updates confirmados de Google: `src/lib/growth/seo/algorithm-updates.ts`
- Copy visible: `src/lib/copy/growth.ts` (`GH_GROWTH_SEO_PERFORMANCE`)
