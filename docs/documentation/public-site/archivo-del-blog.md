# Archivo del blog — Búsqueda, temas, etiquetas y autores

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.3
> **Creado:** 2026-10-24 por Claude (TASK-2055)
> **Ultima actualizacion:** 2026-10-25 por Claude (cabecera de autor con el perfil)
> **Documentacion tecnica:** [BLOG_ARCHIVE_RUNTIME_V1](../../architecture/public-site/BLOG_ARCHIVE_RUNTIME_V1.md)

## Qué es

Es la página que se ve cuando alguien busca en el blog, entra a un tema (por ejemplo HubSpot), a una etiqueta o al
perfil de un autor. Desde el 2026-10-24 usa el mismo diseño de la portada del blog: cabecera azul oscuro con el nombre en
grande, la publicación más reciente destacada y, abajo, todo el archivo ordenado por año.

Antes esas páginas usaban la plantilla de demostración del tema Ohio, en inglés, con un recuadro que decía «Hire us! We are
WordPress specialists», una barra lateral de ejemplo y, en algunos casos, se salían de la pantalla en el teléfono.

> Detalle técnico: [diseño aprobado](../../ui/visual-directions/TASK-2055-blog-archive-v3/README.md) ·
> [auditoría previa](../../audits/public-site/2026-10-24-blog-search-archive-views.md)

## Qué muestra cada página

| Página | Arriba | Abajo |
|---|---|---|
| **Tema** | Nombre en el color de su línea, descripción, cuántas publicaciones tiene y la fecha de la última | La más reciente destacada; el resto por año; otros temas |
| **Etiqueta** | Nombre y una línea que explica que reúne publicaciones de distintos temas | Igual que el tema, y cada fila dice a qué tema pertenece |
| **Autor** | Retrato con la órbita, nombre, cargo y organización, bio corta, los temas sobre los que escribe (enlazados), cuántas publicaciones tiene y su última fecha, y sus redes | Su última publicación y todo lo que escribió, por año |
| **Búsqueda** | El término buscado, el buscador para cambiarlo y cuántos resultados hay | El mejor resultado destacado y el resto por relevancia, con el término resaltado |
| **Tema sin publicaciones** | Explica que todavía no hay publicaciones y enlaza al tema que lo contiene | «Mientras tanto»: el último Glitch, una guía y un artículo |
| **Búsqueda sin resultados** | «Nada sobre «x», todavía.», el buscador y preguntas frecuentes | «Mientras tanto, para empezar» |
| **Glitch** (`/glitch/`) | El logo de Glitch, la última edición y el último Flash, y la frase «sin anestesia.» con la letra de Glitch | Cada fila dice si es una edición (#N) o un Flash; filtro Ediciones y Flash (todo lo de Glitch sin número de edición es un Flash); un recuadro para suscribirse al newsletter |

En todas: migas en español, filtro por formato (artículos, guías, casos, novedades, Glitch), páginas de 10 en 10 y el
cierre «Otros temas del blog». Se ve igual en computador, tablet y teléfono.

## Reglas que conviene saber

- **La búsqueda sólo encuentra publicaciones del blog.** No muestra páginas del sitio, borradores ni plantillas. Una
  búsqueda vacía muestra el buscador, nunca la lista completa del sitio.
- **Un tema aparece en Google sólo si tiene descripción y al menos 4 publicaciones.** Hoy son HubSpot, Glitch, Inbound
  Marketing, Marketing Digital, Loop Marketing y AEO (descripciones aprobadas por el operador el 2026-10-24). Los demás
  temas, las etiquetas, la búsqueda y las páginas filtradas por formato quedan fuera de Google, pero sus enlaces se siguen.
- **Sólo los autores que publicaron tienen página.** La cuenta de integración «Greenhouse» y los usuarios sin
  publicaciones responden «página no encontrada».
- **La descripción de un tema** es el texto bajo su nombre y el que Google muestra en el resultado. Se cambia desde la
  categoría en WordPress o con el comando de descripciones (ver manual).

## Qué no hace

- No cambia la portada del blog ni las entradas.
- No ofrece búsqueda con IA ni filtros combinados por varios temas.
- La página «no encontrada» (404) del sitio todavía usa el diseño anterior.
- La suscripción de la página de Glitch sólo aparece si el formulario de Glitch está conectado; nunca simula una suscripción.

> Detalle técnico: [reglas y matriz de indexación](../../architecture/public-site/BLOG_ARCHIVE_RUNTIME_V1.md#3-reglas-de-wordpress-eobh_archive)
