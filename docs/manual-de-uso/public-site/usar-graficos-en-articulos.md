# Usar gráficos en un artículo del blog — Manual de uso

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.0
> **Creado:** 2026-10-25 por Claude
> **Ultima actualizacion:** 2026-10-25 por Claude
> **Modulo:** Sitio público · blog (WordPress) · bloque «Gráfico Efeonce» (`efeoncepro/chart`, plugin `efeonce-editorial-blocks`)
> **Estado:** probado en WordPress local; **todavía no está en efeoncepro.com** (falta aprobación y despliegue)
> **Documentacion tecnica:** [Estilos editoriales del blog §Gráfico Efeonce](../../public-site/BLOG_EDITORIAL_BLOCK_STYLES_V1.md)

## Para qué sirve

El bloque **Gráfico Efeonce** pone un gráfico animado en un artículo, con los colores de la línea del artículo. Las
cifras quedan escritas en la página como tabla («Ver los datos»), así que Google y las IA las leen aunque no vean el
gráfico.

| Quieres mostrar… | Usa | Tabla que pegas |
|---|---|---|
| Cómo cambió algo en el tiempo | **Líneas** | filas = meses o fechas; hasta 4 columnas de valores |
| Comparar categorías | **Columnas** (agrupadas o apiladas) | filas = categorías; hasta 4 columnas |
| Un ranking | **Barras** | filas = lo que se compara; 1 columna |
| Las partes de un total | **Torta** | filas = las partes (2 a 8); 1 columna; los % se calculan solos |
| Etapas y conversión | **Embudo** | filas = etapas en orden (2 a 8); 1 columna; la conversión se calcula sola |
| Antes y después | **Antes y después** | columnas «Antes» y «Después»; 1 fila = dos columnas grandes; varias filas = una pesa por fila |
| Un porcentaje que importa | **Medida** (el anillo) | 1 fila, un valor de 0 a 100 |
| «X de cada 100» | **De cada 100** | 1 fila, un valor de 0 a 100 |
| Prioridades en dos ejes | **Matriz 2 × 2** | filas = los elementos; 2 columnas (eje horizontal, eje vertical) de 0 a 10 |
| Tres ideas que se cruzan | **Venn de tres** | 3 filas con los nombres, sin valores; lo que las une va en «Etiqueta del centro» |

## Antes de empezar

- Ten la **fuente** de cada número. Si los datos son de ejemplo, escríbelo en la fuente («Ejemplo ilustrativo»).
- Decide **qué quieres que el lector vea**: eso es el título. «Los clics se triplicaron en seis meses», no «Clics por
  mes».
- **Un solo protagonista**: el acento marca una serie, una barra o una parte; lo demás queda en gris azulado.

## Paso a paso

### En el editor de WordPress

1. Agrega el bloque **Gráfico Efeonce**.
2. En el panel lateral, en **Gráfico**, elige el **Tipo**. Debajo aparece qué forma de tabla espera. Si tus datos no
   calzan con el tipo nuevo, el bloque carga un ejemplo para que veas la forma.
3. Escribe el **Título** (la conclusión) y, si quieres, la **Bajada**. Elige el **Tono**: claro (papel) u oscuro (navy).
4. En **Datos**, pega la tabla desde una planilla (Google Sheets o Excel copian con tabulaciones). Primera fila:
   encabezados; primera columna: los nombres de las filas. Se acepta la coma decimal: `5.120,5`.
5. Elige el **Elemento destacado** (o el punto, en líneas), el **Formato** (número, porcentaje o compacto: «12 mil») y,
   si corresponde, la **Unidad** («clics»).
6. En **Fuente**, escribe de dónde salen los números y su enlace.
7. Revisa la vista previa en el editor y, después de guardar, la página en el teléfono.

### Desde la Content Factory (spec del artículo)

```json
{ "kind": "chart",
  "chart": { "kind": "line", "categories": ["May", "Jun", "Jul"], "series": [{ "name": "Con AEO", "values": [1200, 1650, 2100] }], "unit": " clics" },
  "title": "Los clics se triplicaron en seis meses",
  "caption": "Clics desde Google por mes.",
  "sourceLabel": "Google Search Console",
  "sourceUrl": "https://search.google.com/search-console",
  "tone": "light" }
```

El gráfico se valida al armar el borrador: si no calza con su tipo, la Content Factory falla con
`content_factory_article_chart_<motivo>` y el validador marca `chart_data_invalid`.

## Qué significan las señales

| Lo que ves | Qué quiere decir |
|---|---|
| «El gráfico no se muestra: …» (sólo lo ve quien edita) | Los datos no calzan con el tipo; el mensaje dice por qué. El visitante no ve nada en ese lugar |
| El gráfico aparece al bajar, no al cargar | Es a propósito: se descarga y se anima cuando está por entrar en pantalla |
| Sin animación | El dispositivo pidió «reducir movimiento»; el gráfico se pinta quieto |
| En el teléfono, la matriz muestra números en los puntos | Los nombres no cabían junto a los puntos; van en la lista debajo |
| En el teléfono, la torta muestra una leyenda debajo | Igual: no hay espacio para etiquetas alrededor del anillo |

## Qué no hacer

- No pongas números sin fuente, ni datos de ejemplo sin decirlo.
- No uses torta para más de 8 partes ni para datos que no suman un total: usa barras.
- No uses el título para describir el tema: di la conclusión.
- No escribas el bloque a mano en el código del post: usa el editor o la Content Factory.

## Problemas comunes

| Problema | Causa | Solución |
|---|---|---|
| «la cantidad de filas no corresponde» | Cada tipo acepta un rango de filas (ver la tabla de arriba) | Ajusta las filas o cambia de tipo |
| «hay un valor que no es un número» | Celdas con texto, o comas y puntos mezclados | Revisa la fila indicada; usa tabulaciones o punto y coma si tus números llevan coma decimal |
| «hay un valor fuera del rango» | Medida y De cada 100 van de 0 a 100; la matriz, de 0 a 10 | Convierte el dato a esa escala |
| El gráfico se ve como antes de un cambio en el plugin | Caché de Kinsta | Purga la caché después de desplegar el plugin |

## Referencias técnicas

- Bloque: plugin `efeonce-editorial-blocks` → `src/chart/` y `includes/chart/class-eo-chart.php` (repo
  `efeonce-public-site-runtime`); tests `php tests/eo-chart.test.php`.
- Motor del gráfico y contrato: greenhouse-eo `src/editorial-chart-renderer/` (`pnpm renderer:editorial-chart:build`).
- Content Factory: `src/lib/public-site/content-factory/gutenberg-editorial-chart.ts`.
