# 01 · El ciclo mensual de producción

> **Fuente de verdad:** **📘 Playbook Producción** (`3b239c2fefe780ceb71dff4f5bed4646`).
> Se ejecuta **una vez por cada mes de producción**. Cubre el ciclo completo: identificar los
> artículos del mes → rescatar su contenido publicado → análisis SEO/AEO y de contenido →
> reescritura → montaje del proyecto mensual con tareas, subtareas e íconos.

Es agnóstico al mes, al proyecto y a los artículos: donde veas `[Mes]`, `N##` o `[Artículo]`,
sustituye por los valores del ciclo en curso.

**Las fases son independientes**: se pueden ejecutar todas en secuencia o solo la que se pida.
**Única excepción:** la Fase 8 (banners y derivados) depende de la Fase 5 — sin artículo escrito no
se define ninguna imagen.

## Las dos modalidades

Identificar con cuál se trabaja **antes de empezar**. Cambian las primeras fases; el montaje del
proyecto (Fases 6 a 10) es idéntico en ambas.

| Modalidad | Cuándo aplica | Ruta |
|---|---|---|
| **A · Reescritura** | El artículo ya existe publicado y su fila tiene `Enlace` | Fases 1 a 5, luego 6 a 10 |
| **B · Artículo nuevo** | El tema no existe en el sitio: producto por lanzar, tema nuevo del plan del cliente, fila sin `Enlace` | Fases B1 a B5, luego 6 a 10 |

**La diferencia de fondo:** en la reescritura la arquitectura SEO ya está tomada y lo que se hace es
**auditarla**; en el artículo nuevo no existe y hay que **decidirla** —title, slug, metadescripción,
H1 y mapa de encabezados— **antes de escribir una sola línea**.

## Orden canónico de las secciones dentro del artículo

Cada artículo del Content Hub termina el ciclo con **cuatro encabezados desplegables 1**, siempre en
este orden y siempre agregados **al final** de lo que ya exista:

1. `Contenido anterior del artículo`
2. `Análisis SEO/AEO`
3. `Análisis de contenido`
4. `✍️ Reescritura V1`

Mantener el mismo orden en todo el lote: es lo que permite revisar los artículos en serie sin
perderse. Si un artículo quedó con el orden alterado, no hace falta reordenarlo —no se pierde
nada—, pero sí unificar de ahí en adelante.

En **Modalidad B** no hay contenido anterior que rescatar ni página publicada que auditar, así que
la página lleva solo **dos desplegables**: `🧭 Plan editorial y SEO` y `✍️ Artículo V1`.

🔴 **El primer desplegable de la Modalidad B a veces ya viene escrito, y entonces no se duplica.**
Cuando la pieza nace de un **brief editorial** producido aguas arriba, la página del Content Hub ya
llega con un desplegable `📋 Brief SEO/AEO — [tema]`. **Ese brief ES el primer desplegable: no se
crea un `🧭 Plan editorial y SEO` aparte ni se resume el brief dentro de él.** El artículo cuelga
debajo como `✍️ Artículo V1` y su callout de procedencia cita las secciones del brief que usó
(`§4 fan-out`, `§5 estructura`, `§7 producto`, `§8 enlazado`, `§9 on-page`).

Lo que cambia el número de desplegables **es el origen de la pieza**, no una preferencia de formato:

| Cómo nació la pieza | Desplegables | Primero |
|---|---|---|
| **A** · reescritura de una URL publicada | **4** | `Contenido anterior del artículo` |
| **B** · pieza nueva que investigamos nosotros | **2** | `🧭 Plan editorial y SEO` (lo escribimos) |
| **B** · pieza nueva que llega con brief | **2** | `📋 Brief SEO/AEO` (ya está escrito) |

Verificado en el lote de septiembre 2026 (N31, N32, N33): los tres llegaron con brief y ninguno
necesitó plan editorial propio.

---

## Fase 1 · Identificar los artículos del mes

1. Consultar el Content Hub filtrando por `Fecha de publicación` dentro del mes objetivo.
2. Separar primero por **alcance pedido**: reescrituras · artículos nuevos · ya publicados fuera del
   ciclo. Una fila `Idea` que pertenece al bloque de artículos nuevos **no entra por arrastre en una
   ejecución limitada a reescrituras**; se conserva intacta para la Modalidad B.
3. Dentro del alcance, usar `Enlace` para decidir la modalidad, **no para decidir si la fila existe**:
   con `Enlace` → A · Reescritura; sin `Enlace` → B · Artículo nuevo. Si una fila anunciada como
   reescritura no tiene el enlace esperado:
   - Buscar en **Teams** los mensajes de quien planifica el contenido (suele compartir el plan
     mensual con los enlaces).
   - Si tampoco aparece ahí, **reportar al usuario qué filas quedaron sin enlace y continuar con el
     resto**.
4. Los artículos con tema "por definir" se registran igual, pero **sin subtareas** hasta que el tema
   exista.

## Fase 2 · Rescatar el contenido anterior

Para cada artículo con `Enlace`:

1. Abrir la URL publicada en **modo de extracción completa** (el modo rápido del sitio devuelve solo
   la navegación, no el cuerpo). **Una URL a la vez**: la extracción completa es lenta.
2. En la página del artículo dentro del Content Hub, agregar un encabezado desplegable 1 titulado
   `Contenido anterior del artículo` con el contenido íntegro traído del sitio (títulos, párrafos,
   listas, tablas).
3. **No modificar ni borrar nada** del contenido que ya exista en la página.
4. 🔴 **Tener presente su límite:** lo rescatado es una extracción de **texto plano**. Conserva las
   palabras, pero **pierde los enlaces, los ALT, el `title` real, el nivel de los encabezados y el
   marcado**. Sirve para auditar **contenido**; no sirve para auditar la **capa técnica**.

## Fases 3 y 4 · Análisis

→ [`02_ANALISIS_AUDITORIA.md`](02_ANALISIS_AUDITORIA.md)

## Fase 5 · Reescritura del artículo

→ [`03_REDACCION_ARTICULO.md`](03_REDACCION_ARTICULO.md)

Al terminar, mover el `Estado` del artículo en el Content Hub a **`En revisión`** (Fase 10).

---

## Modalidad B · Artículo nuevo

Aplica cuando **no hay URL publicada que auditar**. **Reemplaza a las Fases 2 a 5**; al terminar se
continúa con la Fase 6 igual que en una reescritura. Todo el trabajo previo a la escritura vive en un
único desplegable `🧭 Plan editorial y SEO`, dentro de la misma página del Content Hub.

> No es burocracia: es lo que evita escribir mil cuatrocientas palabras alrededor de un ángulo
> equivocado.

### Fase B1 · Brief de origen

Antes de proponer nada, **buscar qué pidió el cliente**. Casi siempre existe y casi siempre es más
específico de lo que parece.

1. Buscar en **Teams**, en el canal compartido con el cliente, los mensajes de quien planifica el
   contenido. El plan mensual suele traer el tema marcado como "nuevo a desarrollar" y, en el mismo
   hilo, la **referencia exacta** del producto o del ángulo, además del formato que pide el CMS.
2. Buscar en **SharePoint** el material del tema: fichas técnicas en PDF, presentaciones, catálogos.
   **La ficha técnica es la fuente de los datos duros.**
3. Anotar en el plan qué pidió el cliente **con sus palabras**: no es lo mismo "una ficha" que "un
   artículo explicativo". Anotar también qué material prometió y todavía no entrega.
4. Si el usuario menciona que alguien compartió una referencia, **buscarla antes de proponer
   ángulos**. Proponer ideas propias cuando el cliente ya dijo qué quiere es trabajo perdido.

> 🔴 **No declarar que algo no existe solo porque no se encontró.**
> *Caso real:* se dio por hecho que un producto no tenía ficha pública porque no aparecía en el
> listado del catálogo. Sí existía, y el cliente tenía la URL a mano.
> El listado paginado de un catálogo **no** es un índice completo. Antes de escribir "no hay página
> pública": probar el patrón de URL del sitio (`/productos/familia/subfamilia/slug`), buscar el
> nombre exacto en el buscador del sitio y, si sigue sin aparecer, **preguntarle al cliente** en
> lugar de afirmarlo.

### Fase B2 · Decidir el ángulo

La pregunta que abre esta fase: **¿por qué esto es un artículo y no una ficha de producto?** Si no
hay respuesta, todavía no hay artículo.

- Un producto nuevo casi nunca tiene demanda de búsqueda por su nombre: **nadie busca lo que no sabe
  que existe**. Buscar el **problema del lector** que ese producto resuelve y escribir sobre eso.
- Regla del texto: **el lector tiene que entender el problema antes de que aparezca la marca**.
- Dejar escrito en el plan **por qué se descartó el enfoque de ficha**. Es lo que sostiene la
  decisión frente al cliente.
- Si el producto tiene una limitación evidente (un solo color, un solo uso), **no esconderla**:
  explicarla como consecuencia del mecanismo y ofrecerle al lector la alternativa donde sí obtiene
  lo que buscaba.

### Fase B3 · Arquitectura SEO antes de escribir

En la reescritura esto se audita; aquí se **decide**, y todo queda en el plan antes del texto:

- **Keywords:** una principal y tres o cuatro secundarias, cada una con su intención y con **el rol
  exacto que cumple en el artículo** (title, un H2 concreto, una FAQ, los ALT). Marcar la jerarquía
  como **estimación** mientras no haya herramienta de datos.
- **Title, slug, metadescripción y H1**, cada uno con su conteo de caracteres y **en viñetas, no en
  tabla**. **El H1 no repite el title.**
- **Verificar que el slug no colisione** con ningún artículo ya publicado.
- **Mapa de encabezados** completo, con una línea por H2 explicando qué resuelve. Es el esqueleto
  que después se rellena.
- **Longitud objetivo**, coherente con la guía editorial.
- **Dosis del producto:** en qué punto del texto entra, **expresado en porcentaje**, y cuánto ocupa
  del total. La **categoría** se nombra primero y el **producto** después. **Nunca al revés.**

### Fase B4 · Datos verificados

- Volcar al plan una tabla con **todos los datos duros** que pueden afirmarse en el cuerpo, tomados
  de la ficha técnica y de la ficha pública. **Lo que no esté en esa tabla no entra al artículo.**
- Abrir la ficha pública del producto **en vivo** (extracción completa, una URL a la vez) para
  confirmar serie, acabado, presentaciones, productos complementarios y la URL de la calculadora si
  existe.
- 🔴 **Si dos fuentes se contradicen, no elegir una:** dejar ambas en un callout de discrepancia y
  reportárselo al cliente. **Ningún dato en disputa entra al texto.**
- Lo que el cliente no ha respaldado con un documento **no se promete**, aunque suene bien: ahorros
  en dinero, porcentajes de eficiencia o garantías se escriben **solo con respaldo**.

### Fase B5 · Escribir el artículo

Se escribe en un desplegable `✍️ Artículo V1` **debajo** del plan, con la misma estructura interna
que la reescritura (→ [`03_REDACCION_ARTICULO.md`](03_REDACCION_ARTICULO.md)) y las mismas reglas
editoriales. Además, propio de esta modalidad:

- 🔴 **Plan de enlazado en dos direcciones.** Los salientes son los de siempre. Los **entrantes** son
  el paso que se olvida: **un artículo nuevo nace huérfano**, así que hay que listar desde qué
  artículos ya publicados va a recibir enlaces y **en qué sección de cada uno**.
- **Handoff al CMS:** dejar explícito el formato que pide el cliente y recordar que el CMS antepone
  el nombre de la marca al title, lo que puede truncarlo.
- Al terminar, `Estado` a `En revisión` y **renombrar la fila** del Content Hub si traía un marcador
  del tipo "(por desarrollar)".

---

## Fase 6 · Crear el proyecto del mes

En la base **Proyectos**. El proyecto mensual es el **contenedor obligatorio** del ciclo, no una
tarjeta decorativa: antes de crear tareas, buscar si ya existe el proyecto del mismo mes para no
duplicarlo; luego relacionar con él la tarea principal y las ocho subtareas de cada artículo.

| Campo | Valor |
|---|---|
| Nombre del proyecto | `Produccion Creativa - [Mes] [AA]` |
| Ícono | 🎨 |
| Estado | `Planificación` |
| Propietario | Responsable del ciclo |
| Fechas | Primer día → último día del mes |

El estado inicial es `Planificación`. En cuanto exista producción real —por ejemplo, artículos ya
escritos o tareas listas para revisión— se mueve a `En curso`; dejarlo en `Planificación` con trabajo
activo comunica un estado falso.

## Fase 7 · Tareas principales (una por artículo)

En la base `Tareas`, una tarea por artículo **por producir**:

- **Naming:** `Artículo N## - [Título del artículo]`. 🔴 La numeración `N##` es **continua entre
  meses**: continúa desde el último número del proyecto anterior, **nunca reinicia en N1**.
- **Propiedades:** `Responsables` = redactor del ciclo · `Tipo de entregable` = `Contenido` ·
  `Fecha límite` = primera semana del mes (los banners y sociales dependen de esto) · `Proyecto` =
  el proyecto del mes (relación) · `Artículo (Content Hub)` = la fila del artículo (relación) ·
  `Estado` = `Sin empezar` (o el estado real si ya avanzó).
- Los artículos con tema por definir llevan tarea principal pero **sin subtareas**.

## Fase 8 · Subtareas (4 banners + 4 derivados sociales)

Todas con `Proyecto` = proyecto del mes, `Tarea principal` = tarea del artículo, `Responsables` =
diseñador, `Estado` = `Sin empezar`.

| Subtarea | `Tipo de entregable` | `Fecha límite` |
|---|---|---|
| **Banners N1–N4** | `Diseño gráfico` | ~2.ª semana del mes |
| Social **Facebook** · **Instagram Story** · **Pinterest Pin** | `Diseño gráfico` | banners + ~2 días |
| Social **Reel/TikTok/Short** | `Video` • `Motion graphics` | banners + ~2 días |

🔴 **`Artículo (Content Hub)` se puebla en TODAS, también en los banners** — no solo en los
derivados. Hoy 187 de 283 tareas no lo tienen y la trazabilidad artículo→arte cuelga del `N##` del
nombre: si alguien renombra, se pierde (→ [`07_SISTEMA_NOTION.md`](07_SISTEMA_NOTION.md)).

🔴 **Dos numeraciones distintas que no se mezclan:** el **banner numera la PIEZA** (`Banner N1`…
`Banner N4`, reinicia en cada artículo) y el **artículo y el social numeran el ARTÍCULO** (`Artículo
N30`, `Social N30`, continuo entre meses). Nunca `Banner N30-1`.

**`Responsables` = el diseñador del ciclo.** No lo inventes: **míralo en las subtareas del artículo
anterior** y usa el mismo, salvo que el operador diga otra cosa.

Detalle de fichas por pieza → [`05_BANNERS_IMAGENES.md`](05_BANNERS_IMAGENES.md) ·
[`11_FICHA_DE_PRODUCCION_INFOGRAFIA.md`](11_FICHA_DE_PRODUCCION_INFOGRAFIA.md) · copy social →
[`06_DERIVADOS_SOCIALES.md`](06_DERIVADOS_SOCIALES.md)

### Aritmética de aceptación del lote

Para `A` artículos ya escritos dentro del alcance, el proyecto debe terminar con:

- `A` tareas principales;
- `4A` tareas de banner;
- `4A` tareas de derivados sociales;
- `4A` subítems sociales en el Content Hub;
- `9A` tareas totales relacionadas al proyecto.

**Fixture verificado, octubre 2026:** `A = 8`, artículos `N35–N42` → **72 tareas** en el proyecto:
8 principales + 32 banners + 32 sociales, más 32 subítems sociales en el Content Hub. El lote se
produjo en dos pasadas: seis reescrituras `N35–N40` y, después de validar sus briefs y canónicas
planificadas, dos artículos nuevos `N41–N42` por Modalidad B. Calendario interno del fixture:
artículos **7 de octubre**, banners **14 de octubre**, sociales **16 de octubre**.

## Fase 9 · Íconos

Aplicar a **todas** las tareas creadas:

| Tipo de página | Ícono |
|---|---|
| Proyecto mensual | 🎨 |
| Tarea de artículo | ▶️ |
| Banner | 🖼️ |
| Social Instagram | 📱 |
| Social Facebook | 🔲 |
| Social Pinterest | 📍 ⚠️ el de la **tarea**; el **subítem** del Content Hub lleva 📌 (`06`) |
| Social Reel/TikTok/Short | ▶️ |

## Fase 10 · Estados y cierre del ciclo

Los estados son la señal de avance que ve el resto del equipo: **se mueven en el momento, no al
final del mes**.

| Dónde | Cuándo | A qué estado |
|---|---|---|
| Artículo en el Content Hub | Reescritura V1 terminada | `En revisión` |
| Artículo en el Content Hub | Aprobado por el cliente | `Aprobado`, y `Publicado` cuando salga al sitio |
| Artículo en el Content Hub | Sin enlace ni tema definido | Se queda en `Idea`: **no se toca** |
| Proyecto del mes | Empieza la producción real | `En curso` |

Mover el estado **solo** donde se cumple la condición: los artículos ya publicados de ciclos
anteriores y los que siguen sin tema **no se tocan**.

🔴 **El éxito de una escritura no cierra la verificación.** Algunas automatizaciones de Notion pueden
reescribir `Fecha límite` o `Estado` después de crear la página. Hacer una primera lectura de control
al terminar cada nivel y una **segunda lectura fresca al cerrar el lote**; verificar proyecto,
relaciones, responsables, tipo de entregable, fecha y estado contra el calendario interno. El valor
guardado en esa segunda lectura es la evidencia, no el payload enviado.

🔴 **Al reportar avance, separar siempre en tres grupos:** **listos** · **faltantes con el motivo del
bloqueo** · **fuera de alcance** (ya publicados). *Un conteo sin el motivo del bloqueo no sirve para
decidir nada.*

## Checklist de cierre del mes

- [ ] Todos los artículos del mes identificados, modalidad asignada y enlaces faltantes de reescrituras reportados
- [ ] `Contenido anterior del artículo` rescatado en cada página
- [ ] `Análisis SEO/AEO` y `Análisis de contenido` completos
- [ ] Cada análisis verificado contra el HTML de la URL publicada, con su sección de verificación fechada
- [ ] Errores de producción detectados en el sitio reportados al usuario por separado
- [ ] Reescritura agregada sin borrar el contenido previo, con enlaces verificados y sin RGB en el cuerpo
- [ ] Proyecto mensual creado (🎨, fechas del mes y estado real: `Planificación` o `En curso`)
- [ ] Una tarea principal por artículo, numeración continua, relacionada al Content Hub
- [ ] 4 banners + 4 derivados **solo** en artículos ya escritos (el resto sin subtareas o en `Bloqueado`)
- [ ] Cada subtarea de banner tiene su Ficha de contenido completa, derivada del artículo final
- [ ] ALT, nombre de archivo y posición de cada banner coinciden con lo especificado en la reescritura
- [ ] Cada ficha cumple la Spec para imágenes (campos, 1408 × 768, menos de 200 KB, ALT, permanencia)
- [ ] Una sola pieza por artículo marcada 🔁, con sus cuatro variantes sociales
- [ ] Banners creados antes de la reescritura: fichas revisadas contra el texto final
- [ ] Íconos aplicados a todas las tareas según la convención
- [ ] Artículos con tema por definir: tarea creada, subtareas pendientes
- [ ] Reescritura con callout de procedencia, metadatos en viñetas, banners en posición y callout ⚠️
- [ ] Texto releído: sin erratas en nombres de producto ni de color
- [ ] `Estado` de cada artículo reescrito movido a `En revisión`
- [ ] `Estado` del proyecto del mes actualizado
- [ ] Segunda lectura del lote confirma fechas y estados después de las automatizaciones de Notion
- [ ] Conteo de aceptación: `9A` tareas en el proyecto y `4A` subítems sociales para `A` artículos escritos
- [ ] Avance reportado en tres grupos
- [ ] Texto auditado contra la guía de Voz y Tono, con la lista de fallas típicas

### Adicional para artículos nuevos (Modalidad B)

- [ ] Brief buscado en Teams y material en SharePoint **antes** de proponer nada
- [ ] Justificado por escrito por qué es artículo y no ficha de producto
- [ ] Title, slug, metadescripción, H1 y mapa de encabezados decididos antes de escribir, con conteo
- [ ] Slug verificado contra los artículos ya publicados
- [ ] Tabla de datos verificados cerrada, con las discrepancias anotadas y reportadas
- [ ] Ningún claim sin respaldo documental del cliente
- [ ] Plan de enlaces **entrantes** desde artículos existentes
- [ ] Fila del Content Hub renombrada si traía un marcador de "por desarrollar"
- [ ] Canónica planificada marcada como destino futuro si todavía es soft-404; ningún enlace entrante ni derivado se activa antes del QA live
