# Referencia — HTML semántico

Estable, no se reverifica. Es la disciplina que **no tenía dueño** en el inventario de skills:
`semantic HTML` aparecía 5 veces en 260 skills y `Shadow DOM` en cero.

---

## Por qué importa (más allá del discurso)

El markup semántico es la **API que consumen cuatro clientes distintos**, y solo uno de ellos es el
navegador visual:

1. **Lectores de pantalla** — navegan por landmarks, headings, listas y controles. Sin estructura, la
   página es una masa lineal.
2. **El navegador** — modo lectura, autofill, traducción, búsqueda en página, atajos.
3. **Buscadores y motores de respuesta** — la estructura es la que hace un contenido citable.
4. **Agentes** — un agente que opera la página necesita reconocer controles y regiones. Markup
   semántico es lo que lo hace posible sin adivinar píxeles.

Un `<div>` no comunica nada a ninguno de los cuatro.

---

## Landmarks — el esqueleto

```html
<header>            <!-- banner (si es hijo directo de body) -->
  <nav aria-label="Principal">…</nav>
</header>
<main>              <!-- UNO SOLO por página -->
  <search>          <!-- rol search nativo -->
    <form role="search">…</form>
  </search>
  <article>…</article>
  <section aria-labelledby="t1"><h2 id="t1">…</h2></section>
</main>
<aside aria-label="Recursos relacionados">…</aside>
<footer>            <!-- contentinfo (si es hijo directo de body) -->
```

Reglas que se rompen seguido:

- **Un solo `<main>`.** Es el destino de "saltar al contenido".
- **`<nav>` múltiples necesitan `aria-label`** distinto cada uno ("Principal", "Migas", "Pie"). Sin
  eso, el usuario oye "navegación" tres veces y no sabe cuál es cuál.
- **`<section>` sin nombre accesible no es un landmark.** Necesita `aria-labelledby` o `aria-label`;
  si no, usa un `<div>` — un `<section>` anónimo es ruido.
- **`<article>`** = unidad autocontenida y redistribuible (post, card de producto, comentario).
  **`<section>`** = parte temática de algo mayor.
- **`<header>`/`<footer>` dentro de `<article>` o `<section>`** son encabezado/pie **de ese elemento**,
  no landmarks de página. Es correcto y útil.

---

## Encabezados — un índice, no una escala de tamaños

```html
<h1>Reporte de nómina</h1>
  <h2>Resumen del período</h2>
    <h3>Colaboradores activos</h3>
  <h2>Ajustes</h2>
```

- **Un `h1` por página**, que diga de qué es la página.
- **Sin saltos** (`h2` → `h4` es un hueco en el índice).
- **El nivel lo decide la jerarquía del contenido, nunca el tamaño visual.** Si el `h2` se ve grande,
  eso se arregla con CSS.
- **Todo landmark/región relevante debería tener encabezado**, aunque esté visualmente oculto — un
  usuario de lector navega saltando entre headings, y una región sin heading es invisible para esa
  navegación.

Prueba de 10 segundos: extrae solo los headings de la página. Si eso no se lee como una tabla de
contenidos coherente, la estructura está mal.

---

## Listas, tablas, y el resto

### Listas

Nav, menús, resultados, cards, breadcrumbs, tags, timelines. El lector anuncia "lista de 12" — un
contenedor de `div`s no anuncia nada. `<ol>` cuando el orden es información. `<dl>` para pares
clave-valor (fichas de datos, metadatos, glosarios): es la etiqueta correcta y casi nadie la usa.

### Tablas

```html
<table>
  <caption>Pagos de julio 2026</caption>
  <thead>
    <tr><th scope="col">Proveedor</th><th scope="col">Monto</th></tr>
  </thead>
  <tbody>
    <tr><th scope="row">Acme</th><td>1.200.000</td></tr>
  </tbody>
</table>
```

`<caption>` (se puede ocultar visualmente), `scope` en cada `<th>`, `aria-sort` en la columna ordenada.
**Nunca** tabla para layout, **nunca** `div`s con `role="table"` si hay datos tabulares reales.

### El resto que vale la pena

| Elemento | Para |
|---|---|
| `<time datetime="2026-07-27">` | fechas legibles por máquina |
| `<address>` | datos de contacto **del autor/artículo**, no cualquier dirección |
| `<figure>` + `<figcaption>` | imagen/diagrama/código con leyenda |
| `<abbr title>` | siglas en su primera aparición |
| `<mark>` | resaltado de relevancia (resultados de búsqueda) |
| `<output>` | resultado calculado de un formulario |
| `<progress>` / `<meter>` | avance vs medición en un rango |
| `<data value>` | valor legible por máquina de un texto |
| `<fieldset>` + `<legend>` | grupo de controles relacionados (radios, checkboxes) |
| `<hgroup>` | título + subtítulo sin inventar un nivel de heading falso |

---

## Botones y links — la confusión más cara

| | `<button>` | `<a href>` |
|---|---|---|
| Semántica | ejecuta una acción | navega a un recurso |
| Teclado | Espacio y Enter | Enter |
| Menú contextual | — | abrir en pestaña nueva, copiar link |
| Se puede prefetchear | no | sí |

**Si no tiene `href`, no es un link.** Un `<a>` sin `href` no es focusable y no tiene rol de link:
es un `<span>` con estilo de link, y es peor que un `<div>` porque parece correcto.

**`<button>` sin `type` dentro de un `<form>` es `type="submit"`.** Causa clásica de "el formulario se
envía solo al hacer click en cualquier botón". Pon `type="button"` siempre que no sea el submit.

---

## ARIA — las reglas, en orden

1. **No uses ARIA si hay un elemento nativo.** El nativo trae rol, estado, teclado, foco y
   forced-colors gratis.
2. **No cambies la semántica nativa.** `<button role="link">` es un contrasentido para el usuario.
3. **Todo control interactivo debe ser operable por teclado.**
4. **No pongas `aria-hidden="true"` sobre algo focusable.** Crea un elemento que recibe foco y no
   existe para el lector: es de los peores bugs de accesibilidad.
5. **Todo control necesita nombre accesible** (contenido, `<label>`, `aria-label`, `aria-labelledby`).

**ARIA mal puesto es peor que nada.** No agrega una capa: **reemplaza** lo que el elemento decía.

Lo que sí necesita ARIA, porque no hay nativo: `aria-live` para regiones que cambian solas,
`aria-expanded`/`aria-controls` en disclosure, `aria-current="page"` en la nav activa, `aria-sort`,
`aria-busy`, `aria-describedby` para errores y ayuda de formulario.

> Los patrones completos (combobox, treeview, tabs, grid) están en WAI-ARIA APG y su dueña es
> `a11y-architect`. Acá está la regla de decisión, no el catálogo.

---

## Formularios

```html
<label for="rut">RUT</label>
<input id="rut" name="rut" type="text" inputmode="numeric"
       autocomplete="off" aria-describedby="rut-help rut-err" />
<p id="rut-help">Sin puntos, con guion.</p>
<p id="rut-err" role="alert"><!-- error, cuando existe --></p>
```

- **`<label for>` siempre.** Placeholder **no** es label: desaparece al escribir, suele fallar
  contraste y muchos lectores no lo anuncian.
- **`autocomplete` correcto** en identidad, dirección, teléfono y pago. Es accesibilidad (WCAG 1.3.5)
  **y** conversión.
- **`type` correcto** cambia el teclado móvil: `email`, `tel`, `url`, `number` (ojo: `number` no sirve
  para códigos ni RUT — usa `text` + `inputmode`).
- **`name` en cada control** o no viaja en el envío.
- **`<fieldset>` + `<legend>`** para radios/checkboxes: sin eso, el grupo no tiene pregunta.
- **`:user-invalid`** en vez de `:invalid` para no marcar en rojo antes de que el usuario escriba.
- **El error va asociado por `aria-describedby`**, y si es bloqueante, `role="alert"`.

> El **timing** de validación, la recuperación de errores, wizards, autosave y máscaras son de
> `forms-ux`. Acá está el markup.

---

## Web Components — cuándo sí

`Shadow DOM` no aparecía ni una vez en el inventario de skills, y en este ecosistema no se usa. Está
bien: **no lo introduzcas para una feature**.

Tiene sentido cuando: necesitas encapsulación real de estilos para un widget embebible en un host que
no controlas, o un componente que debe funcionar en varios frameworks. En una app React homogénea, el
costo (formularios, SSR, eventos que no cruzan el shadow boundary, estilos que no entran) supera al
beneficio.

Si aparece la necesidad, es una decisión de plataforma → `arch-architect`.
