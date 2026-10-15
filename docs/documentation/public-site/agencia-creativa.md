# Landing Agencia Creativa — Módulos editables en Elementor

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-10-15 por Claude
> **Ultima actualizacion:** 2026-10-15 por Claude
> **Documentacion tecnica:** [AGENCIA_CREATIVA_ELEMENTOR_MODULES_V1.md](../../architecture/public-site/AGENCIA_CREATIVA_ELEMENTOR_MODULES_V1.md)

## Qué es

[`/agencia-creativa/`](https://efeoncepro.com/agencia-creativa/) es la landing pública del servicio creativo
de Efeonce. Desde el 2026-10-15 muestra el diseño aprobado por el operador, construido con 15 módulos
propios de Elementor. El header y el footer son los mismos del resto del sitio.

La página `/agencia-creativa-v2/` es otra landing con otra intención: «producción creativa a escala» (cómo
escalamos la producción, qué medimos, cómo lo medimos y qué logra la marca). Desde el 2026-10-15 está hecha con
los mismos módulos editables de Elementor: nueve propios (`escala-*`) más el diagnóstico y el cierre, que comparte
con esta página. Cambiar un módulo compartido cambia las dos landings. No hay redirección entre ellas; se enlazan.

> Detalle técnico: identidad de la página, hashes y snapshot en el
> [contrato técnico](../../architecture/public-site/AGENCIA_CREATIVA_ELEMENTOR_MODULES_V1.md#identidad-y-estado-vigente).

## Secciones de la página

| # | Módulo | Qué muestra |
| --- | --- | --- |
| 1 | Hero | Apertura de la página |
| 2 | Portafolio | Dos filas de trabajos que se desplazan en loop |
| 3 | Rutas | Caminos de trabajo en pestañas |
| 4 | Formatos | Tipos de pieza en pestañas |
| 5 | Marca | Sección de marca |
| 6 | Producción | Sección de producción |
| 7 | IA | Sección de IA |
| 8 | Equipo | Sección de equipo y talento |
| 9 | Studio | Pantallas de Creative Studio (capturas) |
| 10 | Compra | Sección de contratación |
| 11 | Control | Sección de control del trabajo |
| 12 | Prueba | Caso de Sky con su medidor orbital |
| 13 | Diagnóstico | Formulario de diagnóstico creativo |
| 14 | Preguntas | Preguntas frecuentes en cuatro grupos |
| 15 | Cierre | Llamado final |

El contenido exacto de cada sección se lee en la página o en el editor; esta tabla sólo ordena los módulos.

Las pestañas funcionan con clic y con las flechas del teclado. Si la persona pidió reducir el movimiento
en su sistema, las animaciones se detienen y los videos no se reproducen solos.

## Qué se puede editar

Desde Elementor se editan textos, enlaces, imágenes, videos y números de cada módulo. Las listas (trabajos
del portafolio, rutas, formatos, pilares, ubicaciones, capacidades, ofertas, compromisos, beneficios,
pasos y preguntas) permiten agregar, quitar y reordenar filas. El porcentaje del medidor de Sky es un
número: al cambiarlo, el arco se redibuja solo.

No se puede pegar HTML, CSS ni JavaScript en ningún campo. Cambiar el diseño (no el contenido) requiere
modificar la fuente aprobada, recompilar y desplegar por el carril técnico.

> Detalle técnico: tipos de campo, repeaters y compilador en el
> [contrato técnico](../../architecture/public-site/AGENCIA_CREATIVA_ELEMENTOR_MODULES_V1.md#contrato-técnico).

## Cómo funciona el formulario

El módulo Diagnóstico incrusta el formulario «Diagnóstico creativo» de Greenhouse Growth Forms. Los
campos, el consentimiento y el envío los pone Greenhouse; la página sólo dibuja la tarjeta que lo rodea
(título, badge de 45 minutos y línea de confianza). Si el navegador no carga JavaScript o el formulario no
está disponible, se muestra un texto alternativo en lugar de una caja vacía.

Hoy el formulario se ve en una sola columna, con listas desplegables donde el diseño aprobado mostraba
opciones visibles, sin iconos en las etiquetas y con el enlace de privacidad como dirección completa. La
mayor parte se arregla con configuración (publicar una versión nueva del formulario y ajustar la tarjeta);
algunos detalles visuales requieren mejoras del motor de formularios.

> Detalle técnico: [contrato runtime del formulario](../../architecture/growth-public-forms-runtime-contract.md#diagnóstico-creativo-agencia-creativa).

## Qué está pendiente

- **Primer envío real:** falta que una persona envíe el formulario desde un navegador para confirmar que
  el lead llega a HubSpot (la verificación anti-bots impide hacerlo con automatización).
- **Fidelidad del formulario:** versión nueva con opciones visibles e iconos, y tarjeta con espacio para
  dos columnas; luego, mejoras del motor para el estilo exacto de chips y del checkbox.
- **Validación de contenido por el operador:** la cifra de Sky (94 % en la página; el caso publicado dice
  88 %), los permisos para mostrar trabajos de clientes (Sky, Berel, GORE, Bresler, Eusari, Marca Chile,
  Pabellón) y la imagen y videos del avión Sky, y frases de preguntas y cierre como «nada más que firmar»,
  «aunque no trabajemos juntos» y «Sin compromiso».
- **SEO:** el título y la descripción de Yoast siguen siendo los anteriores («Agencia Creativa en LATAM»,
  «más de 120 marcas»), a la espera de decisión.
- **Prueba de edición en Elementor:** falta comprobar guardar y recargar desde la interfaz del editor.
