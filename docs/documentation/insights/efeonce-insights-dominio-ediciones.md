# Efeonce Insights — Dominio de ediciones (deck, informe A4 y web)

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.13
> **Creado:** 2026-09-15 por Claude (TASK-1845)
> **Ultima actualizacion:** 2026-09-26 por Claude (cierre de TASK-1889: el diseño premium está en producción y ya generó las primeras ediciones internas de Berel y Sky)
> **Documentacion tecnica:** [EFEONCE_INSIGHTS_ARCHITECTURE_V1.md](../../architecture/EFEONCE_INSIGHTS_ARCHITECTURE_V1.md) · [ADR](../../architecture/EFEONCE_INSIGHTS_PLATFORM_DECISION_V1.md) · EPIC-045

## Qué es

Efeonce Insights convierte la evidencia de un cliente (SEO, visibilidad en IA, entrega ICO) en una
**edición**: un informe congelado para un período, con versión, identidad legible (`EO-INS-000123`)
y las mismas cifras en deck, informe vertical y web. Greenhouse guarda la biblioteca, el encargo, los
permisos y el ciclo de vida; los módulos siguen siendo dueños de sus métricas.

La vista web que se comparte por enlace no vivirá en el portal: se mostrará en `think.efeoncepro.com`, el mismo
hub que hoy muestra el informe de visibilidad en IA. Greenhouse sigue siendo dueño del dato y del enlace; Think
sólo lo dibuja (decisión del 2026-09-15). La biblioteca para pedir y revisar informes sí queda en el portal.

La primera unidad (TASK-1845) creó el **núcleo**: crear un encargo, recolectar evidencia, redactar el plan y
dejar la edición lista para revisión. Después se sumaron el deck PDF (TASK-1846), el enlace compartido, el envío
por correo y la recurrencia (TASK-1848, en producción pero apagados) y el informe A4 junto con el deck nuevo
(TASK-1847, en producción desde el 2026-09-24), y el contrato editorial v2 que ordena qué dice cada informe
(TASK-1888, encendido en producción desde el 2026-09-26). **Todavía no existe la vista web.** Como la emisión sigue apagada en
producción, **ahí ninguna edición puede emitirse**: llega hasta `ready_for_review`.

## Cómo se comporta

| Paso | Qué pasa | Quién puede |
| --- | --- | --- |
| Catálogo | Dice qué módulos están disponibles para esa organización y por qué no cuando no lo están (módulo SEO/AEO sin asignar, sin spaces activos para ICO), salidas, audiencias y límites | Quien tenga `insights.report.read` sobre la org |
| Encargo | Módulos, período `[inicio, fin)` en su zona horaria, comparación (período anterior, año anterior, custom), audiencia, salidas, idioma, profundidad, clave de idempotencia | Interno con `insights.edition.create`; cliente sobre su propia organización (roles executive/manager) |
| Generación | `collecting` (cada módulo aporta hechos con unidad, población, cobertura, corte y método; lo ausente se declara, nunca es cero) → `composing` (plan determinista; IA opcional que sólo reescribe texto validado) → `validating` (cada cifra del plan referencia un hecho; un módulo sin evidencia bloquea salvo omisión explícita) → `ready_for_review` | Sistema, por fases; cada fase queda en el historial |
| Revisión y emisión | Emitir es un acto humano separado con `insights.edition.issue` y exige salidas validadas; corregir crea una versión nueva; una emitida sólo se retira | Admin/Account internos; el cliente no emite hoy |
| Lectura | El cliente ve sus ediciones con estado resumido (`in_progress`, `in_review`, `issued`, `needs_attention`) y la evidencia sólo de emitidas; el interno ve el ciclo completo y el historial | Según audiencia |

## Reglas que importan

- **Ausente no es cero.** Si una fuente no cubre la ventana (ETV e ICO sólo sirven meses completos; el
  grader AEO sólo si corrió dentro del período) la edición lo dice con su motivo.
- **Una edición emitida no cambia.** Snapshot y plan quedan sellados con hash; cualquier corrección
  es otra versión del mismo reporte.
- **La organización nunca viene del payload.** El cliente opera su propia cuenta; el interno declara la
  cuenta y el sistema la revalida en cada acción. Sin el módulo `insights_v1` asignado, la organización
  simplemente no existe para ese actor.
- **Misma clave de idempotencia + mismo encargo = misma edición.** Misma clave con encargo distinto se
  rechaza.
- **La IA no calcula ni emite.** Sólo puede reescribir frases; si cambia una cifra se descarta.

## Qué ve cada persona

| Quién | Qué puede hacer | Qué ve de una edición |
| --- | --- | --- |
| Cliente (roles executive/manager de su organización) | Ver el catálogo y sus ediciones; pedir una edición sobre su propia cuenta | Estado resumido (`in_progress`, `in_review`, `issued`, `needs_attention`, `withdrawn`). **La evidencia y el plan aparecen sólo cuando la edición está emitida**; antes vienen vacíos, y no es un error |
| Cliente (rol specialist) | Sólo lectura | Igual que arriba, sin poder pedir ediciones |
| Interno (Admin, Account) | Todo: catálogo, pedir, revisar, corregir, emitir, retirar, recuperar | Ciclo completo, evidencia sellada con hechos y rechazos, plan congelado con sus límites, historial de transiciones |
| Interno (Operations) | Catálogo, pedir, revisar y recuperar; **no emite** | Igual que Admin/Account en lectura |
| Agente por MCP | Catálogo, listar, leer y (con permiso de escritura) pedir; **nunca emite** | Lo que su vínculo con la organización permita |

Como emitir todavía no es posible, hoy un cliente que pide una edición la verá quedar en `in_review` sin
cifras visibles: eso es lo esperado hasta que sus archivos estén renderizados y un interno la emita (el render del
deck y del informe A4 ya corre en staging y producción, pero la emisión sigue apagada en producción; sólo staging la
tiene encendida, para pruebas).

## Los dos formatos y sus gráficos (en producción desde el 2026-09-24)

Una edición produce **el mismo contenido en dos formatos**, y la diferencia no es de estilo sino de
cómo se lee cada uno:

| | **Deck** | **Informe A4** |
|---|---|---|
| Para qué | proyectarse y hojearse | leerse sentado, sin quien lo presente |
| Densidad | una conclusión por lámina | capítulos continuos, con notas al margen |
| Pie | sólo la dirección web | dirección, teléfono y folio en **cada** página |
| Largo | acotado | hasta decenas de páginas, con índice |

**Los gráficos salen del dato, nunca se dibujan a mano.** El sistema calcula cada barra desde el
número que la acompaña y **se detiene si el texto impreso no coincide con lo que dibuja**. Un
gráfico cuya barra no corresponde a su etiqueta no se publica: se rechaza con la causa.

**Qué puede graficar hoy:** barras simples, agrupadas y apiladas, líneas, circular y dona,
dispersión, embudo, cascada, medidor, mapa de calor, waffle, bullet, Venn de dos conjuntos y UpSet.
**De todas ellas, el sistema hoy produce automáticamente sólo cuatro**: barras simples, barras agrupadas y líneas
(visibilidad y entrega) y bullet (entrega contra su meta). El resto está construido y probado, pero todavía no hay
quien genere esos datos. No están ofrecidas como disponibles.

**Tres cosas que el sistema se niega a hacer**, porque harían mentir al informe:

- **Circular con más de tres porciones.** Pasadas unas pocas, nadie compara ángulos: adivina. Se
  ofrece una barra en su lugar.
- **Rellenar un hueco.** Si falta un dato, la línea se corta y la ausencia viaja a la página de
  límites. No se une el trazo ni se dibuja un cero.
- **Recortar para que quepa.** Si una afirmación o una tabla exceden el espacio, el informe se
  rechaza con la causa. Nunca sale un texto amputado.

**Un capítulo sin datos no desaparece**: se cuenta en palabras y su falta queda declarada en la
página de cierre, «Lo que esta edición no puede afirmar». Desaparecerlo convertiría la falta de
datos en silencio.

**Cómo se lee una figura que compara períodos.** Cada métrica aparece como un par: la barra de color es el
período del informe y la gris, el período anterior. Cada par se mide en su propia escala, porque comparar el largo de
«clics» contra el de «impresiones» no dice nada (son magnitudes de cientos de veces de diferencia). Si una figura
no cabe en una página, sigue en la siguiente con «(continuación)»: nunca se descartan barras.

**Qué dicen el período, los límites y la metodología.** El período es la ventana que la edición midió: una edición
del 1 al 20 de septiembre dice «1–20 de septiembre de 2026», no «Septiembre». Los límites y la metodología nombran
las métricas y las fuentes en palabras («Posiciones en buscadores», «Google Search Console, corte al 19 de septiembre
de 2026»), nunca con códigos internos.

**Probado con datos reales (2026-09-22, staging).** Con Grupo Berel (visibilidad orgánica y en motores de
respuesta) y Sky Airlines (entrega), en ediciones internas y sin emitir. La prueba encontró y corrigió errores que los
datos de ejemplo no mostraban, entre ellos que **la tasa de entregas a tiempo (OTD) nunca llegaba al informe** de
entrega por un nombre de métrica distinto: ahora aparece (Sky, agosto: 81,9 %).

**Primer informe real en producción (2026-09-25).** Con autorización del operador se generó una edición **interna**
de Sky Airlines (`EO-INS-000022`, entrega de agosto contra julio de 2026). Salieron el deck (5 láminas) y el informe A4
(8 páginas) al primer intento, y sus cifras coinciden con las de origen: entregas a tiempo (OTD) 81,9 % contra 80,1 % y
rondas por entregable (RpA) 1,33 contra 1,44. La edición sigue interna y sin emitir: emitir y compartir siguen
apagados en producción. Antes se probó la organización de prueba («Greenhouse Demo»), que sirve para ver un deck sin
datos pero no para un informe de entrega: **no tiene datos ICO**, así que una edición de entrega suya se detiene en
la validación por falta de evidencia, que es lo correcto. Pedir de nuevo el render de una edición ya renderizada
devuelve el mismo pedido anterior, no produce archivos duplicados.

> Detalle técnico: arquitectura §14.7 (delta 2026-09-25, cierre de TASK-1847); catálogos
> `src/lib/artifact-composer/catalogs/insights-report/` e `insights-deck/`; mappers en
> `src/lib/efeonce-insights/render/`.

## El diseño aprobado para todos los informes y el contrato editorial v2

> Estado (2026-09-26): **el contrato editorial v2 está encendido en staging y producción** (TASK-1888, cerrada el
> 2026-09-26). Toda edición nueva sale con el plan v2: lectura por figura, «Lo esencial», líneas de alcance y portada
> sellada (ver «Qué trae hoy un informe»). Las plantillas nuevas (TASK-1889) también están en producción: el
> 2026-09-26 se generaron allí las primeras ediciones internas de Berel y Sky con el diseño aprobado. Las ediciones ya creadas no cambian: son inmutables, y las
> reglas nuevas aplican a las ediciones nuevas. Emitir, compartir y enviar siguen apagados en producción, así que
> ninguna edición llega a un cliente sin revisión humana.

El operador revisó página por página un diseño nuevo de informe y lo aprobó como el aspecto que debe tener **todo**
informe de Insights, en A4 y en deck:

- **Portada:** una sola portada con variantes según los módulos, no una por servicio. Puede ser azul marino o blanca
  (con un bloque azul marino arriba). La blanca de visibilidad (SEO y respuestas de IA) muestra alrededor los logos de
  los canales medidos (Google, ChatGPT, Gemini, Claude, Perplexity); la blanca creativa (entrega) va sin logos.
- **Contraportada** con redes, contacto y datos legales de Efeonce; **aperturas de capítulo**; páginas de **resumen,
  lectura y plan**.
- **Páginas de gráfico** que abren con la cifra principal, dicen la conclusión, muestran el gráfico con su fuente y
  cierran con «Lo que significa / Próximo paso».
- **El color dice qué es cada dato:** el período actual en azul marino (o turquesa sobre fondo oscuro), el anterior en
  un turquesa más profundo (o azul lavanda sobre oscuro), una oportunidad en coral, y lo que falta con rayado, nunca con
  un color.

**Portada azul marino o blanca: cómo se decide.** Cada cliente tiene una preferencia, y al pedir una edición se puede
cambiar sólo para esa edición: manda lo pedido en la edición, después la preferencia del cliente y, si no hay
ninguna, «automática». Con «automática», la portada va azul marino sólo cuando el cliente tiene un logo que se lee
bien sobre fondo oscuro; si no, va blanca. Mientras una organización no tenga cargada su versión del logo para fondo
oscuro, «automática» da portada blanca. La portada azul marino **nunca** usa el logo normal
del cliente (sobre azul marino puede no verse): usa su versión para fondo oscuro o va sin logo. La portada elegida queda
fija en la edición: volver a producir el PDF da la misma portada, aunque después cambie la preferencia.

**Quién fija la preferencia y dónde.** Las personas de Efeonce que operan la cuenta (administración y cuentas) la fijan
por cliente: «automática», «azul marino» o «blanca». La
versión del logo para fondo oscuro se carga en los logos de la organización, igual que el logo normal. La pantalla para
hacerlo desde el portal llega con la biblioteca de Insights (TASK-1849); mientras tanto se hace por la API o por un
asistente conectado al MCP de Efeonce (ver el manual).

**Qué gráficos nuevos traerá.** Sólo los que tienen datos que los sostengan, según una tabla que dice qué tipo de
gráfico puede salir de qué módulo:

- **Entrega contra la meta** (entregas a tiempo, primera entrega correcta y rondas de revisión por pieza), un espacio
  por barra, con la meta oficial marcada. La meta sale del registro de métricas de entrega, nunca se escribe a mano.
- **Tendencia mes a mes** cuando el informe cubre tres meses o más (entrega por espacio; tráfico orgánico estimado).
- **Presencia de la marca por motor de IA** con el logo de cada motor (ChatGPT, Gemini, Claude, Perplexity, respuestas
  de Google).

Cada gráfico trae su lectura: la cifra principal, «Lo que significa» (dónde quedó el dato contra la meta o el período
anterior) y, sólo cuando hay una brecha con la meta, un «Próximo paso». La lectura nunca inventa una causa. Los
gráficos sin datos que los sostengan no aparecen: métricas por página o por palabra clave, coincidencias entre
consultas de IA, embudo comercial, y el medidor del puntaje de IA con su período anterior (hoy sólo se lee el último
análisis).

**Cambio de un porcentaje, en puntos (ya aplica).** Cuando la métrica ya es un porcentaje, el cambio se imprime en
puntos: OTD de 80,1 % a 81,9 % es «+1,8 pp», no «+2,2 %». Si el cambio es menor a 0,05 puntos, se imprime con dos
decimales para no escribir «0,0 pp» junto a dos cifras que se ven distintas.

**Cómo se revisa.** Cada plantilla nueva se compara con la página aprobada y no puede diferir en más del 1 % de sus
puntos. Las primeras ediciones reales con el contrato v2 son de Berel (visibilidad orgánica y en IA) y Sky (entrega),
en staging, como informes internos listos para revisión: no se emiten ni se comparten con el cliente hasta que el
operador las revise.

### Qué trae hoy un informe (contrato v2)

El plan de cada edición nueva trae, además de las cifras:

| Parte | Qué es |
|---|---|
| **Lectura por figura** | Cada gráfico lleva su cifra principal con una bajada, la conclusión en una frase, «Lo que significa» cuando hay algo que decir y el próximo paso cuando la evidencia lo sostiene |
| **Apertura de capítulo** | Una afirmación que abre cada módulo; la primera lectura del capítulo es siempre su hallazgo principal |
| **«Lo esencial»** | Hasta cinco hallazgos del período, nunca más |
| **Alcance** | Unas líneas breves que declaran qué cubre la edición y qué no |
| **Portada** | Azul marino o blanca, decidida al crear la edición y sellada en ella |
| **Tabla de respaldo** | «<módulo>: todas las cifras», con cada dato del capítulo |
| **Acciones** | Cada acción del plan con su impacto, su esfuerzo y cuántas semanas toma |

Cada texto tiene un largo máximo; si no cabe, la edición se rechaza con la causa en vez de recortarse.

**Reglas de redacción.** El plan las cumple siempre; si una no se cumple, no sale:

- **Un superlativo exige un máximo único.** «El canal con más presencia» sólo se escribe si ese canal está solo en el
  primer lugar de lo que se imprime. Si hay empate, se dice el empate: la bajada nombra lo que tienen en común y la
  cifra principal es el valor empatado.
- **«Lo esencial» y la tesis sólo citan hallazgos**: una meta alcanzada o no, un cambio que se imprime, un máximo único
  o un empate. Nunca un valor suelto sin comparación, ni una variación de 0,0 %.
- **Sujeto y verbo concuerdan** en cada afirmación de capítulo.

**Referencias de entrega y dirección de cada métrica.** En entrega, el plan suma la primera entrega correcta (FTR) y
las metas y bandas del registro oficial de métricas de entrega como datos de referencia, no como resultados. Cada
métrica sabe si «más es mejor» o «menos es mejor» (en visibilidad, la posición media es «menos es mejor»), y cada canal
de IA o buscador tiene un identificador estable (Google, respuestas de IA de Google, ChatGPT, Gemini, Claude,
Perplexity).

**Cómo se apaga.** El contrato v2 depende de un interruptor que se lee en dos lugares (el portal, para crear, revisar y
recuperar ediciones, y el proceso que corre las recurrencias). Apagarlo en ambos vuelve las ediciones nuevas al plan
anterior; las ya creadas no cambian (ver el manual).

> Detalle técnico: arquitectura §6 (delta 2026-09-25, rediseño premium aprobado);
> `docs/tasks/complete/TASK-1888-efeonce-insights-editorial-contract-v2.md` (estado en arquitectura §14.8; flag
> `INSIGHTS_EDITORIAL_V2_ENABLED` en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`);
> `docs/tasks/complete/TASK-1889-efeonce-insights-premium-catalogs.md`; dirección visual
> `docs/ui/visual-directions/TASK-1889-efeonce-insights-premium-catalogs-direction.md`.

## Cómo se ve un informe y un deck con el diseño aprobado

> Estado (2026-09-26): las plantillas del informe A4 y del deck tienen **sólo** el diseño aprobado por el operador;
> el diseño anterior se retiró del código. El operador aprobó los PDF de Berel (visibilidad orgánica y en
> IA) y Sky (entrega) el 2026-09-25, y **el diseño está en producción desde el 2026-09-26**: las primeras ediciones
> internas de Berel y Sky se generaron ahí con el mismo número de páginas que las aprobadas. Emitir y compartir siguen
> apagados en producción, así que nada llega a un cliente sin revisión humana.

El informe A4 y el deck dicen lo mismo, en el mismo orden; cambia cuánto cabe en cada página.

| Parte | Qué muestra |
|---|---|
| **Portada** | Azul marino o blanca (con un bloque azul marino arriba), con el logo del cliente, el período y «Preparado para». La blanca de visibilidad lleva alrededor los logos de los canales medidos. Sobre azul marino sólo va la versión del logo para fondo oscuro; si no existe, la portada va sin logo del cliente |
| **Índice** | Los capítulos con el número de página real donde empieza cada uno |
| **Resumen y «Lo esencial»** | La tesis del período en una afirmación y hasta cinco hallazgos, cada uno con su cifra y el número real de la página donde está su evidencia |
| **Aperturas de capítulo** | Una página azul marino que anuncia cada módulo (visibilidad, respuestas de IA, entrega) |
| **Páginas de gráfico** | Una por gráfico, con la forma que corresponde a su pregunta (ver abajo) |
| **Tabla** | Las cifras en detalle, en filas ordenadas; si no caben, siguen en la página siguiente con la misma escala |
| **Límites** | «Lo que esta edición no puede afirmar»: cada dato faltante, con su motivo |
| **Contraportada** | Logo, eslogan, redes, correo, teléfonos, dirección, mercados y la línea legal de Efeonce |

**Cada página de gráfico se lee igual.** Abre con la cifra principal, dice la conclusión en una frase, muestra el
gráfico, indica de dónde sale el dato (unidad y fuente) y cierra con «Lo que significa» y «Próximo paso». Ese cierre
sale de la lectura del plan: no se escribe a mano y nunca inventa una causa. Si el dato ya alcanzó la meta, no hay
«Próximo paso» que la evidencia sostenga, y no se escribe.

**Cuatro formas de gráfico, según la pregunta:**

| Forma | Cuándo se usa | Cómo se lee |
|---|---|---|
| **Comparación de períodos** | Métricas distintas entre sí (clics, impresiones, CTR) | Cada métrica en su propia escala, período actual contra anterior. La variación lleva un triángulo que indica si subió o bajó: dice la dirección, no si es bueno o malo |
| **Columnas** | Canales comparables entre sí (por ejemplo, motores de IA) sobre un mismo eje | Una columna por canal. La franja de referencia y la marca de oportunidad aparecen sólo cuando el plan las declara |
| **Metas** | Entrega contra su meta oficial (entregas a tiempo, primera entrega correcta, rondas por pieza) | Lo logrado contra la meta, marcando la «mayor brecha». La zona de atención aparece sólo si el registro de métricas de entrega trae su límite; nunca se escribe a mano. En métricas donde «menos es mejor» (como las rondas), la lectura se invierte |
| **Tendencia** | Ventanas de tres meses o más | Hasta tres líneas, distinguibles también en gris. Si falta un mes, la línea se corta: nunca se une el trazo ni se inventa el valor |

**Una regla para no mezclar peras con manzanas:** van en columnas sobre un mismo eje sólo canales distintos de una
misma métrica. Métricas distintas van siempre en comparación, cada una en su escala.

**Qué pasa cuando falta un dato.**

- **La figura no se dibuja.** Si un gráfico no tiene hechos suficientes, no sale: el capítulo lo cuenta en palabras,
  y la falta aparece en la tabla y en «Lo que esta edición no puede afirmar».
- **Nunca se recorta.** Si un texto no cabe en su espacio, el informe no sale y el rechazo dice qué campo es y cuánto
  mide. La corrección va en el plan, no en amputar la frase.
- **Nunca se inventa.** Ni un cero donde no hay dato, ni un valor interpolado en una línea, ni un gráfico en una forma
  que no le corresponde: un tipo de gráfico que no tiene página propia se rechaza con su causa.
- **Portada sin logo utilizable.** Si el logo elegido no se puede incrustar, el informe se detiene en vez de salir con
  un hueco en la portada.

**Cómo se verificó.** Cada plantilla se compara con la página aprobada del diseño: 20 de 21 páginas difieren en 1 % o
menos. La restante (la lámina de columnas agrupadas del deck) difiere 2,2 % porque el propio diseño la corrió 3
píxeles; el operador aprobó la diferencia el 2026-09-25 y queda vigilada con un techo. Las ediciones reales de Berel y
Sky, revisadas en local, destaparon cinco defectos que los datos de ejemplo no mostraban; los cinco se corrigieron.

> Detalle técnico: [arquitectura §14.9](../../architecture/EFEONCE_INSIGHTS_ARCHITECTURE_V1.md) (estado de
> TASK-1889) y §6 (dirección premium); catálogos `src/lib/artifact-composer/catalogs/insights-report/` e
> `insights-deck/`; página por forma de gráfico en `src/lib/efeonce-insights/render/figure-slots.ts`;
> task `docs/tasks/complete/TASK-1889-efeonce-insights-premium-catalogs.md`.

## Estado de disponibilidad (2026-09-26)

> **Delta 2026-09-25 (TASK-1847 cerrada):** el informe A4 y el deck nuevo están **en producción desde el
> 2026-09-24**, y el 2026-09-25 se renderizó ahí el primer informe con datos reales (edición interna de Sky, ver «Los
> dos formatos y sus gráficos»). Emitir y compartir siguen apagados en producción.

> **Delta 2026-09-22 (TASK-1847):** el informe A4 y el deck nuevo están **en staging**, probados con datos reales de
> Berel y Sky. En staging el deck ya usa el formato propio de Insights (antes usaba el de propuestas comerciales, que
> recortaba textos y omitía métricas). **En producción todavía no**: ahí el informe A4 se rechaza al pedirlo y el deck
> sale con el formato anterior, hasta el próximo release.

**Disponible en producción** desde el 2026-09-15 para las organizaciones que tengan el módulo `insights_v1`
asignado. Lo que está encendido y lo que no:

| Capacidad | Estado | Nota |
| --- | --- | --- |
| Pedir una edición y generarla hasta `ready_for_review` | **Encendida** en staging y producción | Flag `INSIGHTS_GENERATION_ENABLED=true` en Vercel (staging y producción); en Preview sigue apagada |
| Emitir una edición | Apagada en producción | Flag `INSIGHTS_ISSUANCE_ENABLED` OFF en producción (encendido sólo en staging desde 2026-09-18 para las pruebas de TASK-1848); además exige que todos los outputs pedidos estén renderizados y validados |
| Contrato editorial v2 (lectura por figura, «Lo esencial», alcance, portada sellada) | **Encendido en staging y producción** (desde 2026-09-26) | Flag `INSIGHTS_EDITORIAL_V2_ENABLED=true` en Vercel (staging y producción) y en el ops-worker (recurrencias). Aplica a ediciones nuevas; las ya creadas no cambian |
| Redacción asistida por IA | Encendida en producción desde 2026-09-26 | Gemini (flash-lite) reescribe conclusiones y lecturas sin cambiar cifras; si algo no cuadra, queda el texto determinista. Las ediciones de las recurrencias salen sin IA |
| Pedir el render del **deck PDF** de una edición | **Encendido en staging y producción** (desde 2026-09-16) | Staging: probado con cinco decks reales, un reintento y una cancelación. Producción: probado el 2026-09-16 en la organización de prueba — el deck salió solo, al primer intento, y pedir la vista web fue rechazado como corresponde. Ver «Pedir el deck de una edición» |
| Enlace compartido, envío por correo y recurrencia | **En producción, pero apagados** (2026-09-18) | El código salió a producción el 2026-09-18 con los tres interruptores apagados a propósito: se encenderán cuando exista la página pública del enlace en Think (TASK-1875). En staging están encendidos y se probaron completos con una organización de prueba; los dos correos de prueba llegaron al buzón autorizado. Ver las tres secciones siguientes |
| Pedir el **informe A4** de una edición | **Encendido en staging y producción** (producción desde 2026-09-24) | Probado con datos reales de Berel y Sky en staging (2026-09-22) y de Sky en producción (2026-09-25, edición interna). Sale junto con el deck si se piden los dos |
| Pantalla pública del enlace | No existe todavía | TASK-1875 (la página en `think.efeoncepro.com` que muestra el enlace) |
| Usar Insights desde un agente externo por el gateway MCP (`mcp.efeonce.org`) | Lectura sí; escritura todavía no | Gateway v1.9.0 (2026-09-26). Además de ediciones y render, un agente puede **ver** enlaces, envíos y recurrencias (cinco herramientas de lectura) y la preferencia de portada de un cliente; fijar esa preferencia sólo lo pueden hacer vínculos internos de Efeonce. Crear y revocar enlaces existen, pero exigen un permiso de escritura que ningún cliente tiene aún; lo mismo crear ediciones. **Enviar por correo y programar recurrencias sólo se hacen desde el portal**, no por MCP |

**Pedir el deck de una edición (render).** Cuando una edición está `ready_for_review`, quien tenga permiso sobre
esa organización puede pedir su deck PDF. El pedido no devuelve el archivo al instante: queda **en cola** y un
proceso en segundo plano lo produce.

- **Cuánto tarda.** El proceso revisa la cola cada 2 minutos y produce **un deck por vuelta**. Un deck pedido solo quedó listo
  en unos 3 a 4 minutos en lo medido (algo más si el proceso arranca en frío); si se piden varios juntos, cuentan como una fila: cinco decks tardaron unos 11 minutos en
  quedar todos listos (medido en staging). Regla práctica: N decks ≈ 2·N minutos. Dibujar el deck en sí toma unos
  7 segundos; el resto es espera en la cola y arranque del proceso. Si hay propuestas comerciales en cola, pasan
  primero. Cuando el proceso arranca en frío puede lanzarse dos veces para un mismo deck: sólo una lo produce y la
  otra termina sin hacer nada; no aparece un deck duplicado.
- **Estados.** El pedido (run) y cada archivo (output) pasan por `queued`/`running` y terminan en `completed`,
  `failed`, `dead_letter` (se agotaron los intentos o el fallo no se arregla reintentando) o `cancelled`.
  `partial_failed` significa que un archivo salió y otro no.
- **Si falla.** Se puede reintentar: sólo se vuelven a poner en cola los archivos fallidos; lo que ya salió no se
  toca. Un fallo por causa del contenido (por ejemplo, un texto que no cabe en la lámina) vuelve a fallar con la
  misma causa: nada se recorta en silencio y hay que corregir la edición.
- **Cancelar.** Cancela lo que todavía no empezó. Un pedido cancelado es definitivo: reintentarlo no lo reactiva; si
  se quiere el deck, se pide de nuevo.
- **Quién ve qué.** Un cliente no puede pedir ni consultar el render de una edición interna: para él esa edición
  "no existe" (no encontrado) y no se crea nada.
- **Registro.** Cada pedido, reintento y cancelación queda a nombre de la persona que lo hizo, también si es un
  usuario cliente (antes todo quedaba como "sistema").
- **Qué no hace todavía.** Existen el deck y el informe A4 (en producción desde el 2026-09-24). La vista web se rechaza al pedirla. Tener el deck
  no lo envía ni lo comparte: descargarlo, compartirlo y emitir siguen siendo pasos aparte.

## Compartir un informe por enlace

> Estado: en producción desde el 2026-09-18, **todavía no disponible** (interruptor apagado en producción; encendido y
> probado en staging). La página pública que muestra el enlace en `think.efeoncepro.com` es otra unidad (TASK-1875) y
> no existe todavía; el interruptor se enciende cuando exista.

**Qué hace.** Genera un enlace secreto para que alguien sin cuenta en el portal lea una edición **ya emitida** y, si
se permite, descargue sus archivos. El enlace sólo abre esa edición: no da acceso a la biblioteca, no permite pedir
otras ediciones ni consultar otros datos.

**Quién puede.** Admin y Account internos sobre cualquier cuenta que gestionen; el cliente con rol executive sobre
su propia organización. El cliente con rol manager **no** puede compartir. Sólo se comparten ediciones pensadas
para el cliente: una edición interna no se puede compartir.

**Límites.**
- El enlace **siempre vence**: entre 1 y 90 días (30 por defecto).
- Hasta 20 enlaces activos por edición.
- El enlace completo se muestra **una sola vez**, al crearlo. Greenhouse no lo guarda, así que no se puede
  "volver a ver": si se pierde, se crea otro.
- Se elige qué archivos PDF se pueden descargar desde el enlace (deck o informe), sólo entre los que tiene la edición.

**Qué ve quien lo abre.** Una versión de lectura del informe: resumen, capítulos con sus cifras, gráficos y tablas,
límites, metodología y fuentes, más los botones de descarga permitidos. Nunca ve borradores, instrucciones de IA ni
quién preparó el informe. Si el enlace no existe, venció o la cuenta ya no está habilitada, ve "no encontrado" sin
el nombre del cliente; si fue revocado o la edición se retiró, ve que ya no está disponible. Si alguien lo abre
demasiadas veces seguidas, se frena un momento.

**Revocar.** Cualquier enlace se puede revocar en cualquier momento (incluso con la función apagada), y un enlace
revocado no se reactiva nunca. Retirar la edición revoca todos sus enlaces a la vez.

**Qué no se puede deshacer.** Lo que alguien ya descargó sigue en su poder: revocar corta el acceso desde ese
momento, no borra copias. Los registros de acceso guardan si hubo una visita (sin guardar el enlace ni la IP) y
**no** prueban que una persona lo haya leído; se conservan 180 días.

## Enviar un informe por correo

> Estado: en producción desde el 2026-09-18, **todavía no disponible** (interruptor apagado en producción; encendido y
> probado en staging, donde los dos correos de prueba llegaron).

**Qué hace.** Envía una edición emitida por correo, desde Efeonce, a personas elegidas de la lista de usuarios
activos de la organización (o a internos). Cada persona tiene su propio resultado.

**Quién puede.** Sólo Admin y Account internos, desde el portal (o su API interna). Un cliente **nunca** envía correos
desde Efeonce, y los agentes por MCP o el ecosistema sólo pueden **consultar** envíos, no hacerlos.

**Cómo se envía.** Dos formas:
- **Con enlace:** cada persona recibe su propio enlace personal (con las reglas de la sección anterior).
- **Con PDF adjunto:** hay que confirmarlo explícitamente, porque **un adjunto enviado no se puede recuperar**.
- El enlace al portal autenticado todavía no está disponible: responde "aún no listo" hasta que exista la página de la
  edición en el portal (TASK-1849).

**Límites.** Entre 1 y 50 destinatarios, elegidos de la lista (no se pueden escribir correos a mano). Asunto de 3 a
200 caracteres y mensaje de hasta 2000. Si una persona ya recibió la misma edición por la misma vía, no se le vuelve
a enviar.

**Qué significan los resultados.** "Aceptado" quiere decir que el proveedor de correo lo tomó; "entregado", que llegó
al buzón. Nada indica que la persona lo haya leído. Si el sistema no puede saber si un correo salió (por ejemplo,
se cortó la conexión), el destinatario queda **en duda**: no se reenvía solo, porque podría duplicar un correo con
un enlace personal; un interno lo revisa contra el registro de correo antes de decidir. Un envío que falló se puede
reintentar (hasta 5 intentos); en ese caso el enlace del intento fallido se anula y el nuevo intento lleva uno nuevo.

**Qué no hace todavía.** No envía avisos dentro del portal ni por Teams: sólo correo. La presentación final del
correo llegará con TASK-1849.

## Programar informes recurrentes

> Estado: en producción desde el 2026-09-18, **todavía no disponible** (interruptor apagado en producción; encendido y
> probado en staging).

**Qué hace.** Prepara automáticamente una edición por cada período que se cierra (semanal o mensual), con el mismo
encargo cada vez, en la zona horaria de la cuenta. **No emite ni envía nada solo:** cada edición queda lista para
revisión y un interno decide emitirla, compartirla o enviarla.

**Quién puede.** Sólo Admin y Account internos. Quien activa la recurrencia queda como responsable de ella.

**Cómo funciona.**
- Nace como borrador y se activa aparte. Máximo 10 recurrencias activas por organización.
- Espera unos días después del cierre del período para que los datos se asienten (3 por defecto, configurable hasta 15).
- No genera informes de períodos anteriores a su activación. Si el sistema estuvo caído, recupera como máximo el
  último período pendiente (configurable hasta 3), nunca una avalancha de informes viejos.
- Un mismo período nunca genera dos ediciones.

**Cuándo se pausa sola.** Si la persona responsable deja de tener permiso, si el módulo deja de estar disponible
para la cuenta, o si falla tres veces seguidas. El motivo queda visible. También se puede pausar a mano, y retirar
de forma definitiva (una recurrencia retirada no se reactiva).

## Habilitación de una organización y pruebas realizadas

**Cómo se habilita una organización.** Un interno asigna el módulo `insights_v1` a la organización con el
script `scripts/insights/assign-insights-module.ts --org=<id>` (primero sin `--apply` para ver qué haría;
con `--apply` para asignarlo). Pasa por el mismo camino que cualquier módulo del portal cliente (con auditoría),
y es idempotente: si ya estaba, no duplica. Sin el módulo, la organización simplemente "no existe" para
Insights.

**Qué se probó.** En staging, una organización sintética con el módulo asignado pidió ediciones desde el portal
(`EO-INS-000012`) y desde un consumer del ecosistema (`EO-INS-000013`); repetir el mismo encargo devolvió la
misma edición; cambiar el encargo con la misma clave fue rechazado; una organización sin módulo respondió "no
encontrado". En producción se repitió el pedido por el ecosistema (`EO-INS-000014`). En los tres casos la
edición quedó `ready_for_review` **con evidencia de cero hechos**: la organización sintética no tenía datos
ICO en los meses pedidos, así que el snapshot declara cuatro rechazos "sin datos" y el plan lo dice en sus
límites. Es decir: se verificó que la ausencia se declara con honestidad, no todavía un informe con cifras
reales de un cliente.

**Actualización 2026-09-25.** La organización de prueba («Greenhouse Demo») **no tiene datos ICO**: el 2026-09-25 una
edición de entrega nueva suya se detuvo en la validación por falta de evidencia (`evidence_rejected`), que es lo
correcto. Por eso el primer informe con cifras reales en producción se hizo con una edición interna de Sky Airlines,
que tiene 11 meses de datos de entrega (noviembre de 2025 a septiembre de 2026); ver «Los dos formatos y sus
gráficos».

**Cierre de TASK-1845.** Cerró el 2026-09-16: el ensayo de reversión de la migración en la base compartida se hizo
ese día, y la sesión MCP con un usuario humano quedó como verificación opcional.

> Detalle técnico: arquitectura §8 (enlace compartido), §9 (correo y recurrencia) y §14 (estado, rollout, límites e invariantes; §14.6 para TASK-1848); dominio `src/lib/efeonce-insights/**`; rutas
> `src/app/api/platform/{app,ecosystem}/insights/**`; migración
> `migrations/20260915100154428_task-1845-insights-foundation.sql`; script
> `scripts/insights/assign-insights-module.ts`; flags en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`.
