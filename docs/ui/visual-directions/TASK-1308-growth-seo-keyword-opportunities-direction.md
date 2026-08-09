# TASK-1308 — Dirección visual: Oportunidades de keywords

- Modo: `repo-native-benchmark`
- Superficie: `/admin/growth/seo/keywords` (`growth.seo.keywords`)
- Benchmark nativo: `growth.seo.performance` (TASK-1307) — misma recipe, misma familia de tabs
- Estado: **seleccionada — Dirección A**, 2026-08-07
- Targets: desktop 1440×900 · mobile 390×844

## El problema que esta dirección resuelve

La primera implementación pasó los cuatro gates y aun así se veía mal. El diagnóstico, hecho
sobre el frame real y no sobre el código:

**La pantalla dibuja los datos pero no dice lo que significan.** Con Berel, 42 de 50
oportunidades son de **consolidación** y sólo 8 de optimización. Ese es el hallazgo que
cambia el trabajo de la semana, y hoy vive como un número al final de una leyenda.

Y antes de llegar al primer dato hay **seis bandas de chrome**: breadcrumb, titular (con un
vacío al lado porque los controles envuelven), tabs, chips de origen, un `Alert` a todo el
ancho sobre datos de mercado que no existen, y recién ahí el título del chart con su
subtítulo, su nota de cobertura y su leyenda. El fold entero se gasta en preámbulo.

El scatter tampoco ayuda: puntos chicos en una card enorme, sobre un eje logarítmico que
salta por décadas y deja aire muerto arriba.

## Alternativas comparadas

### Dirección A — El veredicto primero ✅ SELECCIONADA

La pantalla **abre diciendo qué significa**, no dibujando. Una banda de veredicto con la
lectura dominante en tipografía de titular, y debajo tres segmentos de acción que **son el
filtro**: contador, forma y etiqueta. El mapa queda de héroe visual pero subordinado al
veredicto. La ausencia de datos de mercado baja a nota al pie del mapa.

- **Primer fold:** breadcrumb → titular + controles en una fila → tabs → **veredicto** → mapa.
- **Jerarquía:** el veredicto manda; el mapa explica; la tabla precisa.
- **Acción:** un solo modelo — los tres segmentos filtran mapa y tabla a la vez.
- **Densidad:** alta abajo, aireada arriba. El contraste ES la jerarquía.
- **Responsive:** los segmentos se apilan a ancho completo en 390; nada se pierde.
- **Detalle de firma:** los segmentos llevan la MISMA forma que el marcador del scatter
  (círculo/triángulo/rombo), así que la leyenda y el filtro son el mismo objeto. Se elimina
  una banda entera de chrome y el contrato colorblind-safe se refuerza.
- **Riesgo de template genérico:** bajo — el veredicto se redacta desde los datos, no es un
  KPI card genérico; y el segmento-como-leyenda no es un patrón de dashboard de catálogo.

### Dirección B — Split: mapa hero + panel de acción

Dos columnas: scatter a 2/3, panel derecho con los tres grupos y su keyword top.

**Rechazada.** El rango útil del eje X es angosto (posiciones 8→20): recortar el scatter a
2/3 de ancho comprime justo la dimensión que decide. Y en 390 el panel colapsa a una lista
más, con lo que la dirección desaparece exactamente donde más falta hacía.

### Dirección C — Tres carriles por acción, sin mapa

Tres columnas, una por acción, cada una con sus keywords ordenadas por ganancia.

**Rechazada.** Mata la lectura de correlación posición×demanda, que es la razón de ser del
scatter (arch §10.4) y lo único que muestra de un golpe dónde está la fruta madura. Además
es card-wallpaper: tres columnas de tarjetas es el patrón que el estándar premium bloquea.

## Mapeo al sistema

| Decisión | Elección |
|---|---|
| Recipe | `analyticsReport`, composición `single`, `plane='none'` (sin cambio) |
| Veredicto | **`new` acotado** — `KeywordOpportunityVerdict`, local a la feature; no hay primitive de "banda de veredicto con segmentos-filtro" y no se justifica promoverla con un solo consumer |
| Segmentos | `Card` + `ButtonBase` por segmento; forma con `clip-path`, mismo glyph que el canvas |
| Mapa | `AppECharts` dentro de `Card` (sin cambio) |
| Tabla | `DataTableShell` (sin cambio) |
| Tipografía | `surfaceHeroTitle` sólo para el h1; el veredicto usa `h4`/`h5` — no compite con el titular |
| Color | Los tres colores de acción ya existen (success/info/warning del theme). Cero HEX nuevo |
| Motion | El contador de cada segmento no anima: es un filtro, y animar un número que el usuario acaba de cambiar con un click confunde causalidad |

## Lo que se elimina (economía de superficies)

1. El `Alert` full-width de mercado no disponible → nota `caption` al pie del mapa.
2. La fila de chips `Medido/Estimado` → se integra en esa misma nota.
3. El select "Acción" de la barra de filtros → los segmentos del veredicto lo reemplazan.
4. La leyenda de formas del mapa → es el propio veredicto.

De seis bandas de chrome antes del primer dato a tres.

## Anti-patrones declarados

- **NUNCA** un `Alert` a todo el ancho para un estado que es una nota al pie. La honestidad
  se mide por si el dato está dicho, no por el tamaño del recuadro.
- **NUNCA** repetir la leyenda del chart y el filtro de la misma dimensión como dos objetos.
- **NUNCA** card-on-card: el veredicto es una superficie hermana del mapa y la tabla.
- **NUNCA** redactar el veredicto con una plantilla fija. Si el reparto cambia (por ejemplo
  cero canibalización), el titular tiene que decir otra cosa — o no decir nada.
