# Referencia — elementos y comportamientos de plataforma

Estado verificado 2026-07-27. Ver `../SOURCES.md`. **Esta página es la que más rápido cambia**: si vas a
comprometerte con algo en producción, reverificá el soporte contra los targets del repo.

---

## `<dialog>` — el modal, resuelto

```html
<dialog id="confirm">
  <form method="dialog">
    <h2>¿Anular el pago?</h2>
    <button value="cancel">Cancelar</button>
    <button value="ok">Anular</button>
  </form>
</dialog>
```

`showModal()` te da, sin escribir nada:

- **top layer** — se dibuja por encima de todo, **sin `z-index`** y sin que ningún `overflow: hidden`
  lo corte. Esto solo borra la categoría entera de bugs de "el modal aparece detrás";
- **foco atrapado** dentro del diálogo;
- **ESC** cierra (evento `cancel`);
- **`::backdrop`** estilizable;
- **inerte** el resto de la página.

Diferencias que importan:

- `show()` → **no** modal, **no** atrapa foco, **no** hace inerte. Casi nunca es lo que querés.
- `<form method="dialog">` cierra el diálogo y expone `dialog.returnValue` con el `value` del botón.
- **`closedby="any"`** (nuevo) permite cerrar con click afuera de forma declarativa, sin listener.
- `request-close` (vía invoker command) dispara el evento `cancel`, respetando la lógica de
  confirmación; `close` cierra directo.

**Animarlo:** `@starting-style` + `transition-behavior: allow-discrete` (ver `css-architect` → `references/platform-2026.md`). Sin eso, la entrada desde `display:none` no transiciona.

---

## `popover` — todo lo que flota y no es modal

```html
<button popovertarget="menu">Acciones</button>
<div id="menu" popover>…</div>
```

- **Top layer** también: adiós `z-index`, adiós portales para escapar de un `overflow`.
- **Light dismiss**: click afuera o ESC lo cierran, gratis.
- `popover="auto"` (default): cierra a otros popovers auto.
- `popover="manual"`: solo se cierra programáticamente.
- **`popover="hint"`**: efímero, **no cierra a los auto**. Es el modo pensado para tooltips que
  aparecen mientras un menú está abierto. Chrome 135 — el más nuevo de los tres.
- `:popover-open` para estilar el estado abierto.

**El combo que reemplaza una librería entera:** `popover` (top layer + dismiss) + **anchor positioning**
(posición y fallbacks) = lo que hacían Floating UI/Popper, en cero JS. El elemento es de esta skill;
el posicionamiento es de `css-architect`.

⚠️ **`popover` no le da rol al contenido.** Un menú sigue necesitando su semántica y su teclado. Para
un menú de comandos real, el patrón APG completo lo gobierna `a11y-architect`.

---

## Invoker commands — botones que actúan sin JS

**Baseline desde diciembre 2025.** Dos atributos en un `<button>`:

```html
<button commandfor="mydialog" command="show-modal">Abrir</button>
<dialog id="mydialog">
  <button commandfor="mydialog" command="close">Cerrar</button>
</dialog>

<button commandfor="mypopover" command="toggle-popover">Alternar</button>
<div id="mypopover" popover>…</div>
```

Comandos built-in: `show-modal`, `close`, `request-close`, `show-popover`, `hide-popover`,
`toggle-popover`, y comandos para `<details>`, `<audio>`, `<video>` y `<select>`.

**Comandos custom** con prefijo `--`:

```html
<button commandfor="my-img" command="--rotate-left">Rotar</button>
<img id="my-img" src="photo.jpg" alt="…">
```

```js
myImg.addEventListener('command', (event) => {
  if (event.command === '--rotate-left') myImg.style.rotate = '-90deg';
});
```

`CommandEvent` se dispara **en el elemento destino**, con `event.source` apuntando al invoker. En JS:
`HTMLButtonElement.commandForElement` y `.command`.

**Por qué importa más de lo que parece:** el cableado "este botón controla ese elemento" queda
**declarado en el HTML**. No hay `useRef` + `useEffect` + handler para abrir un modal; no hay estado de
React que se desincronice del DOM; y el vínculo es legible para herramientas y agentes.

En React: `command`/`commandfor` son atributos normales. Si React aún no los pasa en tu versión,
`commandForElement` desde un ref es el escape.

---

## `<details>` / `<summary>` — disclosure y acordeón

```html
<details name="faq">           <!-- name compartido = acordeón exclusivo, sin JS -->
  <summary>¿Cómo se calcula el ICO?</summary>
  <p>…</p>
</details>
```

- **`name` compartido** hace acordeón exclusivo (se abre uno, se cierra el otro) sin una línea de JS.
- **`::details-content`** permite animar la apertura (con `allow-discrete`), lo que históricamente
  obligaba a medir alturas con JS.
- El contenido **es buscable con Ctrl+F** aunque esté cerrado — algo que ningún acordeón custom logra.
- Evento `toggle` para reaccionar.

**No lo uses para**: tabs (es otro patrón, otro teclado), ni para contenido que debe estar siempre
disponible para SEO crítico.

---

## Customizable select

```css
select, ::picker(select) { appearance: base-select; }
```

Permite estilar el `<select>` y su lista desplegable **conservando toda la semántica y el teclado
nativos** — incluido el comportamiento correcto en móvil. El select y su picker tienen una relación
invoker/popover implícita.

Chrome 134 a 2026-07. **Es la solución correcta a "necesito un select estilizado"** cuando el target lo
permite: cualquier combobox reconstruido con `div`s carga con teclado, anuncio, búsqueda por tipeo y
móvil, y casi siempre queda peor.

Si necesitás multi-select con búsqueda y tags, eso ya no es un `<select>`: es el patrón combobox de
APG, y pasa por `a11y-architect`.

---

## Formularios: lo nativo antes de la librería

| Necesidad | Nativo |
|---|---|
| autosize de textarea | `field-sizing: content` (+ `max-block-size`) |
| validación básica | `required`, `pattern`, `min`/`max`, `type` |
| estilo de error sin marcar de entrada | `:user-invalid` (no `:invalid`) |
| mensaje de error custom | `setCustomValidity()` + `:invalid` |
| agrupar controles | `<fieldset>` + `<legend>` |
| resultado calculado | `<output>` |
| envío sin recarga | `<form>` + `preventDefault`, o Server Action |

> El **diseño** de la experiencia de formulario (timing, recuperación, wizard, autosave, máscaras) es
> de `forms-ux`. Acá está qué trae la plataforma.

---

## Tabla de decisión

| Quiero… | Usá | No uses |
|---|---|---|
| modal bloqueante | `<dialog>` + `showModal()` | div + overlay + trap manual |
| menú/dropdown/tooltip | `popover` (+ anchor positioning) | portal + z-index + click-outside |
| tooltip sobre un menú abierto | `popover="hint"` | `popover="auto"` (cerraría el menú) |
| botón que abre/cierra algo | invoker commands | `onClick` + `useState` + ref |
| acordeón | `<details name>` | div + altura animada por JS |
| select estilizado | `appearance: base-select` | combobox de `div`s |
| textarea que crece | `field-sizing: content` | `useEffect` + `scrollHeight` |
| algo por encima de todo | top layer (`dialog`/`popover`) | `z-index: 9999` |

---

## Cómo decidir cuando el soporte no alcanza

1. **¿Cuál es el target real del repo?** No el navegador de moda: el que usan los usuarios de **esa**
   superficie. El portal interno y un sitio público no tienen el mismo piso.
2. **¿Degrada con gracia?** `popover` sin soporte muestra el contenido siempre visible — feo pero
   funcional. `field-sizing` sin soporte deja un textarea de tamaño fijo — aceptable. Una feature que
   degrada a "no funciona" necesita fallback sí o sí.
3. **¿El fallback cuesta más que la librería?** Si sí, usá la librería **hoy** y dejá anotado el
   reemplazo. Media implementación nativa con media librería es lo peor de los dos.
4. **Escribí la decisión.** "No usamos `<dialog>` porque X" es información; descubrirlo por
   arqueología dos años después, no.
