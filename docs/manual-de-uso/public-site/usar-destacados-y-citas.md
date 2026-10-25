# Usar Destacados y Citas en un artículo del blog — Manual de uso

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.0
> **Creado:** 2026-10-25 por Claude
> **Ultima actualizacion:** 2026-10-25 por Claude
> **Modulo:** Sitio público · blog (WordPress) · plugin `efeonce-editorial-blocks` 0.8.0
> **Ruta en portal:** no aplica: se usa en el editor de WordPress (`efeoncepro.com/wp-admin`) o desde la Content Factory
> **Documentacion tecnica:** [Estilos editoriales del blog §0.8.0](../../public-site/BLOG_EDITORIAL_BLOCK_STYLES_V1.md) ·
> [Recetas de autoría Gutenberg](../../documentation/public-site/gutenberg-post-authoring-recipes.md)

## Para qué sirve

El bloque nativo **Cita destacada** (`core/pullquote`) tiene cuatro estilos de Efeonce. Sirven para dos cosas distintas, y
elegir bien cuál usar es lo más importante:

| Quieres… | Usa | Cómo se ve |
|---|---|---|
| Destacar **la idea en la que se apoya una sección** (una tesis nuestra) | **Destacado Efeonce** (navy) o **Destacado claro** (papel) | Sin comillas. Un anillo abre la frase y una esfera en el color de la línea la cierra, en lugar del punto. La primera parte en peso normal y el remate en negrita |
| Citar **lo que dijo alguien** (Google, un cliente, Julio, un estudio) | **Cita Efeonce** (navy) o **Cita clara** (papel) | Comillas en su propia columna, el texto de la cita y, debajo de una línea fina, quién lo dijo y el enlace a la fuente |

Si la frase es tuya, es un Destacado. Si tiene autor, es una Cita. Un Destacado con comillas o una Cita sin autor
confunden al lector.

## Antes de empezar

- El plugin `efeonce-editorial-blocks` tiene que estar en **0.8.0 o más** (en producción desde el 2026-10-25).
- **Uno o dos por artículo**, nunca seguidos, y sin repetir la oración del párrafo de al lado: si la frase va en el
  Destacado, sácala del párrafo.
- **Navy o papel:** el navy corta la página y llama más la atención. El papel es más liviano, para un artículo con
  varios bloques oscuros o para una idea de apoyo. Puedes combinar los dos en un mismo artículo.

## Paso a paso

### En el editor de WordPress

1. Agrega un bloque **Cita destacada** («Pullquote»).
2. En el panel lateral, en **Estilos**, elige **Destacado Efeonce**, **Destacado claro**, **Cita Efeonce** o **Cita clara**.
3. **Si es un Destacado**, escribe la frase completa y marca en **negrita** su remate, la parte que decide:
   «Si Google no puede indexar tu página, **ninguna IA de Google la va a citar.**». Termínala con punto: el sitio lo
   reemplaza por la esfera.
4. **Si es una Cita**, escribe la cita en el texto y la autoría en el campo de cita, debajo: el nombre en negrita, de
   dónde sale y un enlace a la fuente. Ejemplo: «**Google Search Central** · Las funciones con IA y tu sitio web · Ver
   la fuente».
5. Previsualiza en escritorio y en el teléfono.

### Desde la Content Factory (spec del artículo)

```json
{ "kind": "pullquote", "text": [{ "text": "Si Google no puede indexar tu página, " }, { "text": "ninguna IA de Google la va a citar.", "strong": true }] }
{ "kind": "pullquote", "tone": "light", "text": "Una tesis en papel." }
{ "kind": "pullquote", "variant": "cita", "text": "No hay requisitos técnicos adicionales.", "cite": [{ "text": "Google Search Central", "strong": true }, { "text": " · " }, { "text": "Ver la fuente", "href": "https://developers.google.com/search/docs/appearance/ai-features" }] }
```

- `variant`: `destacado` (por defecto) o `cita`. **Una cita sin `cite` no se genera**: la Content Factory falla con
  `content_factory_article_pullquote_cita_requires_cite`.
- `tone`: `dark` (navy, por defecto) o `light` (papel).
- El texto puede ser un texto simple o una lista de segmentos con `strong` y `href`.

## Qué significan las señales

| Lo que ves | Qué quiere decir |
|---|---|
| La frase sale **toda en negrita** | El Destacado no tiene ninguna parte marcada en negrita. Funciona, pero pierde la jerarquía: marca el remate |
| La frase sale **más grande** | Tiene 80 caracteres o menos; el sitio la agranda sola (`is-eo-corta`) |
| **No aparece la esfera** al final | La frase termina en «?», «!», «…» u otro signo que no es punto. Es a propósito: la esfera sólo reemplaza un punto |
| En **modo oscuro** el panel se ve más oscuro que antes | Es a propósito: el navy oscuro mantiene el contraste del anillo y la esfera (opción aprobada el 2026-10-25) |

## Qué no hacer

- No uses una Cita para una frase tuya, ni inventes un autor para que «se vea mejor».
- No pongas dos Destacados seguidos, ni más de dos por artículo.
- No dejes la misma oración en el Destacado y en el párrafo de al lado.
- No marques en negrita la frase completa: si todo es remate, nada lo es.

## Problemas comunes

| Problema | Causa | Solución |
|---|---|---|
| Publiqué y el Destacado se ve como antes | Caché de página de Kinsta: el despliegue del plugin no la purga | Purga la caché (`kinsta cache purge --all` por WP-CLI) y recarga con un parámetro (`?v=1`) |
| La esfera queda pegada a un signo | La frase terminaba en «…» o en comillas | Cambia el final por un punto, o acepta el final sin esfera |
| La Cita no tiene línea de autoría | El campo de cita quedó vacío | Escribe quién lo dijo; si no hay autor, usa un Destacado |

## Referencias técnicas

- CSS y render: plugin `efeonce-editorial-blocks` → `includes/editorial/editorial.css` y
  `class-eo-editorial-styles.php` (`pullquote_classes`), repo `efeonce-public-site-runtime`, versión 0.8.0 (`61251d1`).
- Content Factory: `src/lib/public-site/content-factory/article-authoring.ts` (`pullquoteBlock`).
- Republicar el contenido de un post ya publicado: `scripts/public-website/blog-post-content-republish.php` (dry-run →
  apply, con guardas de fecha y sha256 y paridad de preguntas frecuentes).
