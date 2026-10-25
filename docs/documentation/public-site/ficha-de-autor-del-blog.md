# Ficha de autor del blog — Quién escribe cada artículo en efeoncepro.com

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.1
> **Creado:** 2026-10-24 por Claude (TASK-2057)
> **Ultima actualizacion:** 2026-10-25 por Claude
> **Documentacion tecnica:** [Portada del blog — runtime V1 §9](../../architecture/public-site/BLOG_HOME_RUNTIME_V1.md#9-autor-del-blog-task-2057) ·
> [TASK-2057](../../tasks/in-progress/TASK-2057-blog-author-profile-card.md)

## Qué es

Cada artículo del blog dice quién lo escribió en dos lugares:

- **Bajo el título:** «Por {autor}», con enlace a todo lo que esa persona escribió, y la fecha. Si el artículo se
  actualizó al menos un día después de publicarse, también dice «Actualizado».
- **Al final del artículo:** una ficha con la foto, el nombre, el cargo, una bio corta, los temas en los que escribe,
  sus redes y el botón «Ver sus N artículos».

Está en producción desde el 2026-10-24. Antes, el final del artículo mostraba el recuadro de autor del tema Ohio, que
traía redes de su demostración (una página de Facebook ajena y un LinkedIn vacío).

> Detalle técnico: [hooks y render](../../architecture/public-site/BLOG_HOME_RUNTIME_V1.md#hooks-y-render).

## Qué muestra la ficha y de dónde sale

| Parte | Qué muestra | De dónde sale |
|---|---|---|
| Foto | La foto de perfil, recortada en un círculo dentro de la órbita | La foto subida al perfil de WordPress (nunca Gravatar); sin foto, las iniciales |
| Nombre | El nombre, con el punto final en el color de Growth | El nombre visible del perfil |
| Cargo y organización | Por ejemplo «Managing & GTM Director · Efeonce Group» | El cargo («Job title») del perfil en Yoast; la organización es fija |
| Bio corta | Dos o tres líneas | La bio corta del perfil (hasta 180 caracteres) o, si falta, el comienzo de la bio |
| Temas | Hasta cuatro temas del blog | Los temas que el perfil declara dominar y que tienen artículos publicados |
| Redes | Instagram, LinkedIn, X y Wikipedia, con sus logos oficiales | Los campos de contacto del perfil en Yoast; la web personal sólo si no es el sitio de Efeonce |
| Botón | «Ver sus N artículos» | La cantidad de artículos publicados; lleva al archivo del autor |

El diseño es el de la línea gráfica «La órbita»: fondo azul oscuro, la foto dentro de un anillo con una pequeña esfera
en el color de Growth y la esquina superior izquierda recta. Se ve bien en teléfono, tablet y computador.

Delta 2026-10-25. Tras la revisión del operador, la ficha queda más contenida en computador: la foto es más chica
(160 px en vez de 208), la ficha es más angosta (800 px en vez de 920) y el nombre, la bio y el botón usan letras algo
más pequeñas. En el teléfono no cambia: foto de 120 px y botón a todo el ancho. Bajo la ficha hay un espacio amplio
antes de los artículos relacionados. Está publicado desde el 2026-10-25. Al pasar el mouse, los temas, las redes y el
botón se iluminan sin perder el texto ni el logo. El círculo o la línea azul que acompaña al mouse es el cursor del tema del sitio, no parte de la ficha.

## Reglas que conviene saber

- **Una sola fuente por dato.** El cargo, la bio y las redes se escriben una vez, en el perfil de WordPress, y la misma
  información alimenta la ficha y lo que Google lee del autor (su ficha de persona en el código de la página).
- **Google ve al autor como parte de Efeonce.** El código de la página dice que el autor trabaja en la organización
  Efeonce del sitio, no sólo en un nombre escrito.
- **Sin datos inventados.** Si falta el cargo, no se saca de la bio; si falta la foto, salen las iniciales; si no hay
  redes, la fila no aparece.
- **Sólo las personas tienen ficha.** La cuenta de integración «Greenhouse» y los usuarios sin artículos no muestran
  ficha.
- **Cambiar la foto o el cargo tiene un paso extra.** Hay que pedir que se reconstruya la información del autor en
  Yoast; si no, al compartir la página del autor puede salir la foto anterior. Cómo hacerlo:
  [manual de operación](../../manual-de-uso/public-site/operar-contenido-portada-blog.md#después-de-cambiar-foto-o-cargo).

## Qué no hace

- No cambia la portada del blog ni el archivo del autor (eso es la [portada](portada-del-blog.md) y el
  [archivo del blog](archivo-del-blog.md)).
- No corrige los enlaces sociales generales del tema Ohio: el de YouTube todavía apunta a una página ajena y se
  arregla aparte.
- Todavía no cambia la dirección del archivo del autor (`/author/jreysgo/`) ni enlaza una web personal propia.

> Detalle técnico: [reglas y pendientes](../../architecture/public-site/BLOG_HOME_RUNTIME_V1.md#reglas).
