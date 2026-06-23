# Manual de uso — Widget Comparison Table (sitio publico)

> **Para:** operador de marketing / editor del sitio publico.
> **Documentacion funcional:** [comparison-table-widget.md](../../documentation/public-site/comparison-table-widget.md)
> **Ultima actualizacion:** 2026-06-23 (TASK-1224)

## Para que sirve

Editar la tabla comparativa de 2 columnas del sitio publico (hoy "GLOBE vs Agencia Tradicional" en `/agencia-creativa/`) **sin tocar imagenes ni Figma**. Todo el contenido y el estilo se administran desde el editor Elementor.

## Antes de empezar

- Necesitas acceso de edicion a `efeoncepro.com` (Elementor).
- El widget se llama **"Comparison Table"** y vive en la categoria **"Greenhouse"** del panel de widgets.
- Cualquier cambio se publica en el sitio real: revisa en vista previa antes de actualizar.

## Paso a paso — editar el contenido

1. Abre la pagina en Elementor (ej. `Agencia Creativa`).
2. Haz clic en el widget de la tabla. Se abre el panel a la izquierda con dos pestanas: **Contenido** y **Estilo**.
3. En **Contenido → Cabeceras**:
   - "Etiqueta columna dimension" (ej. `Dimension`).
   - "Titulo columna A" (la opcion de referencia, ej. `AGENCIA TRADICIONAL`).
   - "Titulo columna B" (dejar **vacio** si usas logo).
   - "Logo columna B" (sube/elige la imagen del logo, ej. Globe).
   - "Mostrar cinta best option" (interruptor) y "Texto de la cinta" (ej. `BEST OPTION`).
4. En **Contenido → Filas**: cada fila tiene Dimension, Celda A, Icono A, Celda B, Icono B.
   - Usa el icono **Check** para las ventajas y **Cruz** (o Ninguno) para lo tradicional.
   - Puedes agregar, reordenar o borrar filas con el repetidor.
5. Vista previa y **Actualizar**.

## Paso a paso — cambiar colores (opcional)

1. En el panel del widget, pestana **Estilo**.
2. "Preset": `Globe (calido)` o `Neutral`.
3. "Radio de esquina": ajusta lo redondeado del bloque (vacio = usa el preset).
4. "Colores (override del preset)": cada color que **dejes vacio hereda el preset**; el que llenes, lo reemplaza. Puedes ajustar:
   - Header izquierdo (crimson), Header Globe (naranja) y su brillo.
   - Agencia: vino / purpura / indigo (degradado del lado izquierdo).
   - Globe: coral / durazno / rosa-malva (degradado del lado derecho).
   - Cinta: violeta claro / oscuro / doblez.
5. Vista previa y **Actualizar**.

## Que significan los estados / senales

- **Cinta "Best Option"**: marca la columna recomendada. Se apaga con el interruptor de la cabecera.
- **Reacomodo en movil**: en pantallas chicas la tabla pasa sola a tarjetas. No hay que subir una imagen de movil.
- **Movimiento**: las animaciones (entrada, hover, brillo de cinta, resplandor del cursor) son automaticas y se desactivan solas si el visitante usa "reducir movimiento".

## Que NO hacer

- **No** vuelvas a subir las imagenes `Tabla-Globe-scaled.webp` / `Tabla-Globe-Mobile-1.webp` — quedaron reemplazadas por el widget.
- **No** pongas el texto de la tabla dentro del logo ni como imagen: el valor del widget es que el texto sea real (accesible/SEO).
- **No** edites el codigo del plugin desde aqui; los cambios de codigo van por el repo del sitio (ver referencias tecnicas).

## Problemas comunes

| Sintoma | Causa probable | Que hacer |
|---|---|---|
| El logo no se ve | Falta el archivo en "Logo columna B" | Vuelve a elegir la imagen del logo |
| Los colores no cambian | El campo quedo vacio (hereda preset) | Llena el color que quieras forzar en pestana Estilo |
| Veo un estado viejo tras editar | Cache del sitio | Pide purgar cache (Kinsta) o reintenta tras unos minutos |
| El movimiento no aparece | El visitante tiene "reducir movimiento" activo, o el navegador no soporta animaciones por scroll | Es esperado: el contenido se ve igual, solo sin animacion |

## Referencias tecnicas

- Skill operativa: `efeonce-public-site-wordpress` (seccion "Custom Elementor widget").
- Estrategia de widgets custom: `docs/documentation/public-site/wordpress-custom-widgets-react-strategy.md`.
- Gobernanza por agentes (manifest): TASK-1225 (pendiente).
