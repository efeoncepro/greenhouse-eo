# Footer global del sitio — Pie de página de efeoncepro.com

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-10-31 por Claude
> **Ultima actualizacion:** 2026-10-31 por Claude
> **Documentacion tecnica:** [Footer global del sitio público V1](../../architecture/public-site/PUBLIC_SITE_FOOTER_V1.md)

## Qué es

Es el pie de página que aparece al final de todas las páginas de `efeoncepro.com`. Se rehízo el 31 de octubre de 2026
(versión 3) sobre la versión del 14 de octubre, siguiendo el diseño que el operador aprobó en el canvas de Contacto
(página «Footer», tablero «Footer propuesto · cinco columnas»). Primero se eligió una versión de cuatro columnas y
después se cambió a cinco.

Ese mismo día se revisó en vivo en Contacto, Home, el blog y Agenda, en escritorio, tablet y teléfono: no se sale de la
pantalla y el formulario de Glitch se carga una sola vez.

> Detalle técnico: ver [arquitectura §Capas y propiedad](../../architecture/public-site/PUBLIC_SITE_FOOTER_V1.md#capas-y-propiedad).

## Qué ve el visitante

**El fondo.** Un azul noche muy profundo (el mismo de los degradados de AXIS), con una línea fina más clara arriba y
entre secciones. Reemplazó al gris carbón que traía el tema, que chocaba con las bandas azules con que terminan
Contacto y Agenda. Junto a esas bandas se ve casi negro; en el canvas parece más azul sólo porque lo rodea una interfaz
gris. Es el mismo color. Se ofreció aclararlo y el operador prefirió dejar el del canvas.

**Cinco columnas**, de izquierda a derecha:

| Columna | Qué muestra |
| --- | --- |
| Marca | El logo, «Trabajamos con organizaciones en Latinoamérica y Estados Unidos.», cinco banderas redondas (Chile, Colombia, México, Perú y Estados Unidos) y las redes sociales. |
| Explora | Enlaces a las secciones del sitio. |
| Contacto | La casa matriz (Dr. Manuel Barros Borgoño 71, of. 1105, Providencia, Santiago de Chile), el correo `hola@efeoncepro.com` y dos teléfonos: `600 914 0660` («Solo desde Chile») y `+1 (239) 235-2073` («Estados Unidos»). El correo y los teléfonos se pueden tocar para escribir o llamar. |
| Glitch | El logo de Glitch, «El newsletter semanal de IA, marketing y negocios, en tu correo.» y el formulario para suscribirse. |
| Trabaja con nosotros | Un botón «Ver vacantes» que abre la página de empleos de Efeonce en otra pestaña. |

Debajo van los logos de nueve partners (HubSpot, Salesforce, Adobe, Microsoft, AWS, Google Cloud, Claude, OpenAI y
BytePlus), cada uno con un tamaño que compensa su forma para que ninguno se vea más pesado que otro, y todos con el
mismo espacio entre sí.

Al final, la línea legal: «© 2026 Efeonce Group SpA. Todos los derechos reservados.» y los enlaces «Privacidad y
cookies» y «Preferencias de cookies», separados por espacio (sin la barra « | »).

**En tablet** las columnas se acomodan de a dos: Marca y Explora arriba, Contacto y Glitch después, luego Empleo y los
partners. **En teléfono** Marca y Explora van lado a lado; después Contacto (con los dos teléfonos lado a lado), Glitch,
Empleo y los partners. En todos los tamaños, lo que hay debajo de cada título empieza a la misma altura.

**Al pasar el cursor**, los enlaces de Explora, los de Contacto, «Volver arriba» y los legales se ponen turquesa. Los
íconos de redes y «Ver vacantes» se quedan en blanco papel. Antes esto sólo funcionaba en Home; desde el 31 de octubre
funciona en todas las páginas.

> Detalle técnico: grilla por ancho, colores y hovers en
> [arquitectura §Grilla por ancho](../../architecture/public-site/PUBLIC_SITE_FOOTER_V1.md#grilla-por-ancho) y
> [§Tokens y colores](../../architecture/public-site/PUBLIC_SITE_FOOTER_V1.md#tokens-y-colores).

## Glitch, el newsletter

El formulario del footer es el mismo que usa el blog para suscribirse a Glitch: misma configuración y mismo destino en
HubSpot. Quien se suscribe desde el footer o desde el blog entra igual. El aviso de privacidad bajo el formulario es el
consentimiento; no hay casilla que marcar.

En el footer el formulario usa los colores del pie (blanco papel y turquesa), no el verde de Glitch: el operador
encontró que el verde chocaba con el resto del sitio. El campo dice «Tu correo» (antes «Tu correo electrónico», que se
cortaba en el ancho de la columna); ese cambio también se ve en el blog.

El diseño aprobado muestra el formulario ya abierto (campo y botón a la vista). Hoy en producción aparece primero como
un botón que se abre al tocarlo; se verá abierto cuando salga el próximo release de Greenhouse a producción, sin tener
que tocar WordPress.

Este formulario reemplazó al anterior del tema (un formulario de Contact Form 7 conectado a Mailchimp, que ya estaba
desconectado).

> Detalle técnico: ver [arquitectura §Glitch](../../architecture/public-site/PUBLIC_SITE_FOOTER_V1.md#glitch).

## La dirección

La oficina antigua («Las Bellotas 199») se reemplazó por la casa matriz en todos los lugares donde aparecía: el footer,
la ficha de contacto del sitio, la dirección de la tienda de WordPress, un bloque inactivo y las páginas `/agendar/`
(publicada y borrador) y Landing Loop Marketing. En `/agendar/` también cambió el teléfono a `+56 9 3732 3064`; el
horario de atención se mantuvo. El número antiguo sólo queda en la cuenta de un plugin de WhatsApp que está inactivo.

> Detalle técnico: ver [arquitectura §Escritura: scripts y guardas](../../architecture/public-site/PUBLIC_SITE_FOOTER_V1.md#escritura-scripts-y-guardas).

## Cómo se cambia

El footer no se edita a mano en el panel de WordPress. Cada cambio es un script que primero comprueba que el footer
está exactamente como se espera, guarda una copia de respaldo, escribe, relee lo escrito y limpia la caché. Si algo no
calza, no escribe nada. Así siempre se puede volver atrás.

> Detalle técnico: paso a paso en [Operar el footer global](../../manual-de-uso/public-site/operar-footer-global.md).

## Qué queda pendiente

- El tema del sitio tiene un archivo antiguo que fuerza el gris carbón y el color de los enlaces del footer fuera de
  Home. El footer nuevo le gana, pero lo correcto es borrar esas reglas del tema cuando exista un camino ordenado para
  desplegarlo.
- La barra « | » entre los enlaces legales la pone el plugin de cookies; hoy el footer la esconde. Lo correcto es que el
  plugin deje de ponerla.
- El formulario de Glitch abierto depende del próximo release de Greenhouse.

> Detalle técnico: ver [arquitectura §Pendientes](../../architecture/public-site/PUBLIC_SITE_FOOTER_V1.md#pendientes).
