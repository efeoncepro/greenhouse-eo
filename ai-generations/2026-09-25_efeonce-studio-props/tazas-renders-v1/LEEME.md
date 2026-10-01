# Tazas Efeonce · referencias multivista

**Uso:** referencias visuales de objeto para modelos generativos. La línea gráfica permanece abierta y no aprobada; esta entrega desarrolla los recursos que el operador pidió conservar.

## Diseño de esta entrega

- Una taza cilíndrica de cerámica esmaltada, labio redondeado, pared y fondo con grosor, asa D y pie inferior.
- Cara de palabra: **Hacer.**, a escala amplia, desde Bricolage Grotesque real.
- Cara opuesta: logo Efeonce oficial pequeño, abajo y con espacio alrededor.
- Blanco con interior azul; azul, magenta y naranja con interior blanco. El exterior y el asa siempre comparten color.
- Sin las tramas pendientes de aprobación. No se inventa un vocabulario nuevo ni se interpreta esto como cierre de marca.

## Archivos para usar

`blanco/<color>/`: PNG individuales, fondo blanco, 1600 × 1600 px, sin títulos, números ni marcas editoriales. Un solo objeto por archivo. Sin sombras proyectadas extensas ni ambientación que contaminen la referencia.

`contactos/<color>.png`: diez vistas ordenadas para seleccionar la referencia. Las etiquetas existen solo en las hojas de contacto.

`00-familia.png`: comparación de las dos caras principales de los cuatro colores.

`manifest.json`: diseño, colores, vistas, orientación de cámara y procedencia.

## Vistas de cada color

1. Frente de la palabra.
2. Tres cuartos de la palabra, hacia el asa.
3. Tres cuartos de la palabra, hacia el lado opuesto.
4. Perfil del asa.
5. Perfil sin asa.
6. Reverso con logo bajo.
7. Tres cuartos del logo, hacia el asa.
8. Tres cuartos del logo, hacia el lado opuesto.
9. Superior, abertura e interior.
10. Inferior, base y pie sin impresión.

## Cómo pasarlas a un modelo generativo

Selecciona el color correcto y la vista más cercana a la cámara de la escena; añade una segunda vista complementaria si necesitas fijar el diseño de la cara opuesta. Conserva cuerpo, asa, interior, color y ubicación de la impresión. No pidas al modelo que transforme una vista frontal en un reverso si tienes la vista de reverso disponible.

Las vistas laterales pueden mostrar el texto parcialmente u ocultarlo: es la oclusión real de la geometría, no falta de impresión. La vista inferior es una toma desde debajo del objeto y no representa la taza apoyada sobre una mesa.

## Procedencia y límites

Render 3D local en Blender Cycles, con trazado de rayos. Todas las vistas usan la misma malla y los mismos UV; las cuatro variantes solo cambian materiales/textura. El logo sale de `public/branding/logo-full.svg` y `logo-negative.svg`; la palabra sale de la fuente del repositorio. No se ha solicitado a un modelo generativo que dibuje letras o logos.

Los PNG son renders, no fotografías de unidades fabricadas. Las dimensiones del modelo (altura aproximada de 94 mm y diámetro exterior de 82 mm) son decisiones para dar continuidad a las referencias, no una ficha de producción ni una capacidad certificada.

`rgba/` conserva masters con transparencia; `texturas/` conserva artes SVG/PNG; `taza-master.blend`, el modelo editable. No se incluyen duplicados transparentes en el ZIP principal para evitar mezclar variantes de fondo al seleccionar referencias.

## Verificación de entrega

40 PNG individuales y cuatro hojas de contacto revisados. Dimensiones y fondo blanco comprobados. Detalles de corrección y motor en `QA.md`.
