# Avisos para Notion (pendientes: la escritura fue bloqueada por permisos)

Van al inicio de cada página, como callout morado. No reemplazan contenido.

## 1. Skill · Producción de imágenes con IA · Blog SKY (5e4b2473…)

**Actualización del 02-11-2026: la línea gráfica del Blog SKY ya está codificada.** Esta página sigue siendo la guía de
oficio para Diseño; los valores ejecutables (medidas, zonas, reglas que fallan cerrado) viven en el Creative Workbench,
familia `brands/sky-airline/blog/`, y la usan los agentes con la skill `sky-blog-graphic-line`. Si esta página y el
Workbench difieren, manda el Workbench y se corrige aquí. Estado: candidato, pendiente de aprobación de Diseño y de
Marca SKY.

Qué cambia respecto de lo escrito abajo:

- **Primer plano:** deja de ser obligatorio. Va por defecto cuando es plausible, y cada foto declara el elemento real o
  por qué no lleva. No se inventan flores, manos ni rodillas.
- **Portada (IMG 1):** el tema del blog recorta la foto a 2,42:1 en escritorio y 1,34:1 en móvil, y escribe categoría,
  título y fecha sobre la **mitad inferior** (medido en vivo). El protagonista va en la mitad superior central, sin tocar
  el borde de arriba; la mitad inferior va tranquila y no demasiado clara. Cada portada se mide antes de exportar. De las
  11 portadas de octubre pasan 3 (Lima, Paraty y Copacabana).
- **Exportación:** se recorta del maestro (preferido 3840×2160) a 1408×768, y la portada también a 1200×630 y 1080×1080,
  en WebP bajo 200 KB, con un comando en lugar de los `magick` manuales.
- **Banner de ruta:** opción A (color) y B (foto), 1408×400 y 1080×1080, WebP bajo 150 KB. El botón «Ver vuelos a
  {ciudad}» y la etiqueta de ruta salen fijos; se rechazan precios, «Oferta», «Imperdible», «Está bueno SKY» y
  comparaciones, y una ruta sin verificar.

## 2. Spec Imágenes (cbf3b294…)

**Actualización del 02-11-2026.** Ajustes a esta Spec, ya codificados en la línea gráfica del Blog SKY (Creative
Workbench, `brands/sky-airline/blog/`; skill `sky-blog-graphic-line`). Estado: candidato, pendiente de aprobación de
Diseño y de Marca SKY.

- **Primer plano cercano:** pasa de «obligatorio» a «por defecto cuando es plausible», siempre declarado: el elemento real
  o la razón por la que no lleva.
- **Portada:** el protagonista va en la mitad superior central, porque el tema escribe el título sobre la mitad inferior
  en escritorio y en móvil. La spec de cada portada debe decir dónde está el detalle crítico de la escena.
- **Banner de ruta:** 1408×400 (escritorio) y 1080×1080 (móvil), WebP bajo 150 KB. Antes sólo figuraba en una ficha.

## 3. Páginas de Berel dentro de la wiki de SKY (decisión pendiente)

«Banners» (Comunicación Visual - Formatos, 1e439c2f…) y «Flujo de Producción Diseño» (ec039c2f…) son contenido de Berel.
Propuesta: moverlas al teamspace de Berel. Falta confirmar el destino.
