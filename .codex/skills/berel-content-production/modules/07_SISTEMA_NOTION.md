# 07 · El sistema del cliente en Notion

> Estructura verificada contra el workspace **efeonce** el **2026-08-25**. Los nombres de propiedad
> están **exactos**, con sus mayúsculas, acentos y rarezas. Si cambian, esta página miente: revalidar
> antes de escribir.

## Las dos bases

| | `Tareas` | `📆 Content Hub ` |
|---|---|---|
| Page ID | `35c39c2fefe780c9bc37e811a7b95a7c` | `35f39c2fefe7808186efc6ec63475640` |
| Data source | `collection://35c39c2f-efe7-8139-8448-000b7ed67b13` | `collection://35f39c2f-efe7-8141-8653-000b87e9ec93` |
| Propiedades | **69** (22 de ellas fórmulas) | **18** |
| Volumen (2026-08-25) | 283 filas | 123 filas |
| Título | `Nombre de tarea` | `Nombre` |

⚠️ Dos rarezas reales, no erratas: el **título de la base Content Hub lleva un espacio al final**
(`📆 Content Hub `) y la propiedad `Días de retraso ` de `Tareas` **también termina en espacio**.

## `Content Hub` — las propiedades que se tocan al producir

| Propiedad | Tipo | Valores |
|---|---|---|
| `Nombre` | title | — |
| `Estado` | status | **to_do:** `Idea` · **in_progress:** `Bloqueado`, `En feedback`, `En curso`, `En revisión`, `Aprobado` · **complete:** `Publicado`, `Archivado` |
| `Tipo` | multi_select | `Publicación de blog` · `Podcast` · `Video` · `Tweet` · `Facebook` · `Instagram` · `Publicación patrocinada` · `Serie de Artículos` · `Ebook` · `Storytime` · `Newsletter` · `Pillar Page` |
| `Responsable` | person | — |
| `Fecha de publicación` | date | filtro de la Fase 1 |
| `Fecha límite` | date | — |
| `Enlace` | url | **la URL publicada**: es lo que decide Modalidad A vs B |
| `Revisión Banners` | url | — |
| `Multimedia` | file | portada de las vistas board |
| `Resumen de IA` | text | — |
| `Tareas` | relation → `Tareas` | contraparte de `Artículo (Content Hub)` |
| `ítem principal` | relation self (limit 1) | **es lo que convierte una fila en subítem** |
| `Subítem` | relation self | — |
| `Pilar JTBD` · `Buyer Persona` · `Email Marketing` · `Calendario de Contenidos` | relation | ecosistema aguas arriba |
| `🎬 Estado de video` | select | `⚪ Sin video` · `🟡 Planeado` · `🔵 En producción` · `🟢 Publicado` |

**Flujo real de `Estado`:** `Idea` → `En curso` → `En revisión` → `En feedback` → `Aprobado` →
`Publicado`, con `Bloqueado` y `Archivado` como salidas. (El orden que devuelve Notion para el grupo
`in_progress` **no** es el flujo; no lo uses como guía.)

**Plantillas de página disponibles** (8): `Publicación de blog` · `Pillar Page` · `Podcast` ·
`Video` · `Publicación patrocinada` · `Serie de Artículos` · `StoryTime` · una plantilla de Ebook
que **conserva el título de un caso ajeno a Berel** (CRM / go-to-market) — es herencia del template
original de Notion, **no doctrina Berel**: no la tomes como referencia editorial.

## `Tareas` — las propiedades que se tocan al producir

De las 69, el ciclo mensual usa estas:

| Propiedad | Tipo | Cómo se llena |
|---|---|---|
| `Nombre de tarea` | title | `Artículo N## - [Título]` · `Banner N# - …` · `Social N## - Derivado: [Canal] — [Tema]` |
| `Estado` | status | **to_do:** `Detenido`, `Sin empezar`, `Pendiente Dir. Arte` · **in_progress:** `Listo para diseñar`, `Listo para revisión`, `Cambios Solicitados`, `En curso`, `Bloqueado` · **complete:** `Cancelada`, `Listo`, `Archivadas` |
| `Tipo de entregable` | multi_select | `Contenido` (artículo) · `Diseño gráfico` (banners, FB, IG, Pin) · `Video` • `Motion graphics` (Reel) · también existen `Desarrollo web`, `Presentaciones`, `Documentación` |
| `Responsables` | person | redactor o diseñador según la pieza |
| `Fecha límite` | date | artículo semana 1 → banners semana 2 → sociales +2 días |
| `Proyecto` | relation | el proyecto del mes |
| `Artículo (Content Hub)` | relation | la fila del artículo |
| `Tarea principal` ⇄ `Subtareas` | relation self | jerarquía nativa de subtareas |
| `Resumen` | text | 1-2 líneas: formato + eje del copy + destino |

🔴 **Las 22 propiedades de tipo fórmula no se editan.** Toda la capa de RpA, urgencia, freeze/thaw y
performance es **calculada**. Tampoco se tocan las de integración con Frame.io
(`Frame Asset ID`, `Frame Comments`, `Frame Versions`, `Last Frame Comment*`, `URL Frame.io`), que
las alimenta una Cloud Function, ni su carril paralelo `Workflow *`; `Review Source`
(`Auto` / `Frame.io` / `Workflow`) decide cuál manda.

### 🔴 `[GH] RpA v2` es writeback de Greenhouse — no se toca desde acá

La propiedad `[GH] RpA v2` (number) la **escribe Greenhouse**; del lado de Notion es **read-only**.
Es el mismo contrato que gobierna todas las métricas `[GH]`: **Notion es el sistema operativo del
cliente, Greenhouse es el motor de métricas**. Producir contenido en esta base **nunca** implica
crear ni editar una fórmula de métrica → skill `greenhouse-ico` +
`docs/architecture/metrics/ICO_DELIVERY_METRICS_AGENT_INVARIANTS.md`.

## Las dos jerarquías paralelas — no confundirlas

- **Dentro de `Tareas`:** `Tarea principal` ⇄ `Subtareas` (sub-task nativo de Notion). Los banners y
  los derivados sociales cuelgan de la tarea del artículo por acá.
- **Dentro de `Content Hub`:** `ítem principal` (limit 1) ⇄ `Subítem`. El artículo padre y sus
  derivados sociales como filas hijas.

Consecuencia: **el mismo derivado social existe dos veces** — una fila en `Content Hub` (hija del
artículo) y una fila en `Tareas` (hija de la tarea del artículo). **Es por diseño**, no duplicación
accidental: la primera lo muestra en el ecosistema de la pieza, la segunda lo pone en el flujo de
producción.

## ⚠️ La trazabilidad artículo→arte hoy se sostiene por convención de nombres, no por la relación

Cobertura real medida el 2026-08-25:

| | n |
|---|---|
| Tareas **con** `Artículo (Content Hub)` | 96 |
| Tareas **sin** `Artículo (Content Hub)` | 187 |

Entre las que salieron sin vínculo hay tareas `Banner N1…N4` — **literalmente las imágenes del
artículo**. Hoy la trazabilidad la sostiene el `N##` del nombre: **si alguien renombra, se pierde**.

**Qué hacer con eso:** al crear tareas nuevas, **poblar siempre `Artículo (Content Hub)`** —también
en los banners, no solo en los derivados. No es opcional aunque el nombre ya lleve el `N##`.

## Formato en Notion (reglas que evitan pérdida de texto)

- 🔴 **Nunca usar el carácter de barra vertical dentro de una celda de tabla:** **parte la fila y se
  pierde el texto que va después**. Por eso los titles del tipo `Tema` + separador + `Marca` van en
  viñetas, no en tabla.
- Evitar los símbolos `<`, `≤` y `~` sueltos en el cuerpo: escribirlos en palabras — "menos de
  50 g/L", "hasta 200 KB", "más de 60.000 ciclos".
- Los **encabezados desplegables** se crean como `# Título {toggle="true"}` con todo su contenido
  **indentado un tabulador**.
- **Notion canoniza parte del formato al guardar** (tablas, escapes, negritas pegadas a código).
  Son cosméticos **para el lector, NO para el editor**: 🔴 **el texto guardado ≠ el texto que
  enviaste** — una tabla queda con un `<tr>` y un `<td>` por línea. **Antes de cualquier edición
  anclada sobre contenido ya guardado, relee la página y copia el ancla del estado actual.** Si la
  edición devuelve `No matches found`, **el ancla es el problema: relee, no reintentes**. Y no
  intentes "arreglar" la canonización: solo se vuelve a editar si hay un cambio real de contenido.
- **Editar con reemplazos pequeños anclados en texto copiado literalmente de la página.** No
  reescribir la página entera.
- Las relaciones (`Proyecto`, `Tarea principal`, `Artículo (Content Hub)`, `Responsables`) se pasan
  como **arreglos de URLs**.
- **Crear primero el proyecto, luego las tareas principales, luego las subtareas**: cada nivel
  necesita la URL del anterior.
- 🔴 **No borrar nunca contenido existente.** Los análisis, el contenido rescatado y las
  reescrituras se **agregan** como secciones desplegables nuevas.

## ⚠️ Deriva observada: el esqueleto real del artículo no es el documentado

El artículo más completo de la base —"Impermeabilizante para azotea: cómo elegir el correcto"
(`3a639c2fefe78087a9f6fd5eae3a8e5e`)— tiene **tres** toggles de primer nivel:

```
# Research                {toggle="true"}
# Plan Editorial SEO/AEO  {toggle="true"}
# ✍️ Artículo V1          {toggle="true"}
```

El Playbook documenta **cuatro** toggles para Modalidad A y **dos** para Modalidad B
(`🧭 Plan editorial y SEO` + `✍️ Artículo V1`). El artículo observado es una Modalidad B **con un
toggle `Research` extra**, y el nombre del plan tampoco coincide literalmente.

🔴 **No resuelvas esta divergencia en silencio.** Puede ser evolución no documentada del proceso o
una excepción de esa pieza. **Pregunta cuál rige**; si el `Research` separado ya es la práctica,
hay que actualizar el Playbook, no seguir produciendo con dos esqueletos en paralelo.

Misma advertencia con la **longitud**: la guía editorial dice **900–1.200+ palabras** y ese artículo
declara **1.400–1.800** (entregó ~1.500).

## Cross-links

- Qué se llena en cada fase → [`01_CICLO_MENSUAL.md`](01_CICLO_MENSUAL.md)
- Oficio Notion (API, webhooks, sync, writeback, límites) → skill `notion-platform`
- Contrato de métricas `[GH]` y frontera Notion↔Greenhouse → skill `greenhouse-ico`
