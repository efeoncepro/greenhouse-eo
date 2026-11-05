# ISSUE-191 — La serie diaria de Search Console cuenta sólo los clics con consulta visible

## Ambiente

producción (instancia Cloud SQL compartida; afecta a Insights, al tablero SEO y a todo reader de `seo_gsc_daily`).

## Detectado

2026-11-04, al valorizar el tráfico del blog de Berel (octubre de 2026) con el método `gsc_clicks_country_cpc_v1`: el
control de Search Console sin dimensión de consulta no cuadraba con la cifra del informe Insights.

## Síntoma

El informe Insights de Berel (alcance «blog», octubre de 2026) dice que los clics orgánicos subieron de 799 a 1.065
(+33,3 %). Search Console, pidiendo el total por página sin consulta (`aggregationType=byPage`, `dataState=final`,
mismo alcance), da 3.540 → 4.094 (+15,6 %). En todo `berel.com`: la serie materializada suma 14.899 clics en octubre;
Search Console da 32.790 (`byProperty`) o 34.219 (`byPage`).

| Medida (Berel) | Septiembre 2026 | Octubre 2026 |
| --- | ---: | ---: |
| Blog — `seo_gsc_daily` (lo que imprime Insights) | 799 | 1.065 |
| Blog — control GSC sin consulta (`byPage`) | 3.540 | 4.094 |
| Sitio — `seo_gsc_daily` | 14.156 | 14.899 |
| Sitio — control GSC sin consulta (`byProperty`) | 31.610 | 32.790 |

## Causa raíz

`src/lib/growth/seo/gsc-daily-materializer.ts` materializa sólo `dimensions: ['query', 'page']`. Cuando se pide la
dimensión consulta, Google omite las consultas anonimizadas (y aplica límites de filas), así que la suma de esa tabla
es un subconjunto del total. `readSeoOverviewKpisForWindow` suma esa tabla para clics, impresiones, CTR y posición, y
el adapter SEO de Insights lo consume. El contrato candidato del blog
(`docs/architecture/EFEONCE_INSIGHTS_BLOG_MEASUREMENT_CONTRACT_V1.md` §4 GSC) ya dice que el KPI de clics debe salir
del control sin consulta; la implementación vigente no lo hace.

## Impacto

- Todo informe Insights con capítulo SEO subreporta clics e impresiones y puede cambiar la variación (Berel blog:
  +33,3 % impreso contra +15,6 % del control). El informe de septiembre de Berel (vista previa entregada el
  2026-10-12) imprimió 799 clics del blog; el control da 3.540.
- La lectura por consulta (qué consultas explican el cambio) y por página siguen siendo válidas como detalle, pero su
  denominador no es el total.
- Afecta también al tablero SEO y a cualquier consumer de `seo_gsc_daily` que la presente como total.

## Solución

**Insights (code complete local, 2026-11-04, sin release):** reader `readSeoSearchControlForWindow`
(`src/lib/growth/seo/search-control/`) lee el control en vivo (totales, serie diaria y páginas, `byPage`, `final`,
alcance por expresión de página) y el adapter SEO (`seo_report_adapter_v2`) toma de ahí clics, impresiones, CTR,
posición, bloques semanales, referencia del sitio y páginas. Las consultas siguen del detalle y la cascada agrega el
paso «Consultas que Google no muestra». Si el control falla, límite; nunca la tabla. Ediciones selladas no cambian.

**Valor orgánico (code complete local, 2026-11-05, sin release):** el método `gsc_clicks_country_cpc_v1` ya medía con el
control sin consulta; su collector acepta ahora propiedades `sc-domain:` y el alcance de contenido (misma expresión de
página que el reader del control). El reader `readOrganicTrafficValueForWindow` lo lleva al capítulo SEO de Insights
(`organic_value_usd`, con clics valorados sobre el total del control), sólo con CPC ya capturados y sin comprar. Ver el
delta del [ADR](../../architecture/GREENHOUSE_ORGANIC_TRAFFIC_VALUE_DECISION_V1.md) y la
[arquitectura de Insights §5.2](../../architecture/EFEONCE_INSIGHTS_ARCHITECTURE_V1.md).

**Rollout de lo anterior:** pendiente. Commits locales `a01a043dc`, `4c2de9aca` y `b583cd93f` en `develop`, sin push
ni release: nada corre en Vercel ni en el `ops-worker`. El runtime que genere la edición necesita
`GROWTH_SEARCH_CONSOLE_ENABLED=true`, `GOOGLE_SEARCH_CONSOLE_OAUTH_CLIENT_ID` y
`GOOGLE_SEARCH_CONSOLE_OAUTH_CLIENT_SECRET_SECRET_REF`. El informe de octubre de Berel se armó con la vista previa
local, no con una edición de producción.

**Tablero SEO y demás readers de `seo_gsc_daily`:** pendiente. Dirección propuesta: materializar además una serie diaria por página SIN consulta (control)
— o por propiedad — y que los totales de clics/impresiones/CTR salgan de esa serie, dejando `query × page` como detalle
con cobertura declarada (clics con consulta visible / total). Cambia las cifras históricas impresas: requiere versión
del método en el snapshot de Insights y aviso al cliente cuando la serie corregida reemplace a la anterior.

## Verificación

Para una organización y un mes: suma de la serie de control = respuesta de Search Console sin dimensión `query`
(mismo `type`, `dataState`, agregación y alcance); el capítulo SEO de una edición nueva imprime ese total y declara la
cobertura de consultas.

## Estado

open

Delta 2026-11-05: Insights code complete local (rollout pendiente); el tablero SEO y los demás readers de
`seo_gsc_daily` siguen sin corregir. Se cierra cuando todo total presentado salga del control y la corrección esté
desplegada.

## Relacionado

- `src/lib/growth/seo/gsc-daily-materializer.ts`, `src/lib/growth/seo/overview/read-overview-kpis.ts`
- `src/lib/efeonce-insights/adapters/seo-adapter.ts`
- `src/lib/growth/seo/search-control/read-search-control.ts`, `src/lib/growth/seo/organic-traffic-value/read-for-window.ts`
- Método de valor orgánico: `docs/services/sky-blog-seo/INDICADOR_VALOR_ORGANICO_V1.md`
- Evidencia local: `.captures/berel-organic-value-2026-10/inputs-2026-09.json`, `inputs-2026-10.json`
