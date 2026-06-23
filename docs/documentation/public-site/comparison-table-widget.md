> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-06-23 por Claude (TASK-1224)
> **Ultima actualizacion:** 2026-06-23 por Claude
> **Documentacion tecnica:** [wordpress-custom-widgets-react-strategy.md](wordpress-custom-widgets-react-strategy.md) · skill `efeonce-public-site-wordpress`

# Widget Comparison Table — Tabla Comparativa del Sitio Publico

## Que es

Es un **widget propio de Elementor** (no de Ohio) que muestra una **tabla comparativa de 2 columnas** ("nuestra opcion" vs "el resto") en el sitio publico `efeoncepro.com`. Hoy esta en la landing de agencia (`/agencia-creativa/`) mostrando **GLOBE vs Agencia Tradicional**.

Reemplaza a la version anterior, que eran **dos imagenes** (una de escritorio y una de movil). Al ser ahora una tabla real:

- El texto es **seleccionable, accesible y lo lee Google** (mejor SEO).
- Se ve **nitido en cualquier pantalla** (no se pixela).
- Se **edita sin volver a Figma ni exportar imagenes** — el equipo de marketing cambia el contenido desde el editor.
- **No necesita una imagen aparte para movil**: la misma tabla se reacomoda sola en tarjetas.

## Que muestra

| Parte | Descripcion |
|---|---|
| Cabecera izquierda | Color magenta/crimson de marca. Titulo "Dimension" + "Agencia Tradicional". |
| Cabecera derecha (Globe) | Color naranja. Logo de Globe centrado como pieza protagonista. |
| Cinta "Best Option" | Cinta violeta doblada sobre la esquina de la columna Globe, marcando la opcion recomendada. |
| Filas | Cada fila compara una dimension (Produccion, IA generativa, Marca, etc.): a la izquierda lo tradicional, a la derecha la ventaja Globe con un check. |

## Como se comporta

- **Escritorio:** tabla de 3 columnas (Dimension · Agencia · Globe), centrada, con esquinas redondeadas y una sombra suave tipo "glow".
- **Movil:** cada dimension se convierte en una **tarjeta** apilada (etiqueta → dato tradicional → ventaja Globe), sin necesidad de una segunda imagen.
- **Colores fieles a la marca:** los degradados (lado Agencia oscuro vino→indigo, lado Globe coral→durazno→rosa) estan calibrados contra el diseno maestro AXIS en Figma.

## Microinteracciones (movimiento)

El widget tiene movimiento sutil, siempre elegante y respetando la preferencia de "reducir movimiento" del sistema operativo del visitante:

- **Entrada en cascada:** al hacer scroll, las filas aparecen escalonadas y los checks de Globe "se prenden".
- **Hover de fila** (en computador): al pasar el mouse, la fila se realza y el check crece levemente.
- **Brillo en la cinta:** un destello recorre la cinta "Best Option" cada cierto tiempo.
- **Resplandor que sigue el cursor:** un brillo suave acompana al puntero sobre la tarjeta.

> Si el visitante activo "reducir movimiento", todo se muestra estatico de inmediato, sin animaciones.

## Quien lo administra

- **Marketing**, desde Elementor: cambia titulos, filas, logo, la cinta y los colores (ver el [manual de uso](../../manual-de-uso/public-site/comparison-table-widget.md)).
- A futuro, **agentes / Nexa** podran administrarlo de forma gobernada: el widget ya expone un contrato de colores estable preparado para eso (TASK-1225, aun no ejecutada).

## Es reutilizable

Es una **primitiva**: la misma tabla sirve para otras comparativas futuras (planes, nosotros-vs-competencia, antes/despues), solo cambiando el contenido y, si se quiere, los colores.

> Detalle tecnico: plugin `eo-elementor-widgets` (widget `greenhouse_comparison_table`) en el repo `efeoncepro/efeonce-public-site-runtime`. Contrato, tokens, ribbon, microinteracciones y schema de theming en la skill `efeonce-public-site-wordpress` (seccion "Custom Elementor widget"). Gobernanza por manifest = TASK-1225.
