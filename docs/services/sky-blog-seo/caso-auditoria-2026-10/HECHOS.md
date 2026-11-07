# Caso SKY · Hechos verificados (fuente única de cifras)

Corte de datos: GA4 y Search Console al 21-10-2026; sitio, SERP y Semrush al 23-10-2026. Cada cifra que aparezca
en docs, skills, informes o correos de este caso sale de aquí. Evidencia reproducible (no versionada):
`.captures/sky-blog-seo-audit-2026-10-23/{tech,data,content,serp}`.

## Tráfico (GA4, sesiones Organic Search en el blog y su prefijo anterior)

| Momento | Sesiones |
| --- | --- |
| Ene-2025 | 208.099 |
| Sep-2025 (antes de migrar) | 75.506 |
| Oct-2025 (después de migrar) | 42.585 |
| Ene-2026 (pico de verano) | 67.940 |
| Sep-2026 | 28.954 |
| Oct-2026, días 1–21 | 18.669 (vs 28.994 en 2025: −35,6 %) |

- Interanual 2025: mar −17 %, abr −29 %, may −35 %, ago −48 %. Migración observada 26–27/09/2025.
- 2024 se movió entre 132 mil y 224 mil sesiones/mes.

## Search Console (`https://blog.skyairline.com/`)

- Al 01-11-2026 se creía que era la única propiedad con acceso. **Delta 05-11-2026:** el token de la conexión de SKY
  también ve `https://www.skyairline.com/` (`siteFullUser`, `sites.list`). Ver «Hechos del 05-11» al final.

- Clics/día por página: ene–feb 2026 2.354 → ago–sep 984 (−58 %). Por propiedad: 2.174 → 912.
- Pérdida ene–feb → ago–sep por tipo (clics/día): equipaje y políticas −771, destinos internacionales −220, Chile
  −186, consejos −82, empleo/corporativo −79, Perú −32.
- Sin marca: 432 → 115 clics/día, posición 6,3 → 9,1. Marca: 384 → 189, CTR 17,0 % → 7,3 %.
- Quiebre de posición hacia el 20-04-2026 (6 → 8). Escalón desde el 15-10-2026 en búsquedas de marca de equipaje;
  SERP CL del 23-10: el blog fuera del top 10 para «sky equipaje».
- 266 consultas con dos o más URL relevantes; 41 grupos curados con 217 artículos que compiten entre sí.
- Entre 62 % y 70 % de los clics vienen de consultas anonimizadas.
- Tráfico desde asistentes de IA: ~650 sesiones/mes (≈2 % del orgánico, >90 % ChatGPT).

## Semrush (estimaciones)

- Chile: `/blog/` ago-2025 ~19 mil keywords, 1.090 top 3, US$ 20.642/mes; subdominio sep-2026 13.383 keywords,
  611 top 3, US$ 5.239/mes. 76 % de las keywords del blog activan AI Overview (sep-2026).
- Perú: `/blog/` sep-2025 7.238 keywords, 387 top 3, 51.284 visitas; subdominio sep-2026 3.627, 98, 6.749;
  US$ 7.887 (ago-2025) → 850 (sep-2026).
- Guías de Perú (ago-2025 → hoy): trujillo-peru 5.328 → 241; viaje-a-juliaca 3.436 → 88.
- Dominios de referencia: subdominio 262; `skyairline.com` 7.316.

## Técnico (sitio publicado, 23-10)

- Redirecciones antiguas: muestra de 110 → 93,6 % mismo slug, 3,6 % slug equivalente, 2,7 % a 404; cero 302/307 y
  cero redirecciones a la home.
- Sin plugin SEO: 0 de 1.700 artículos con meta description, JSON-LD o autor. Antes (Wayback 12-09-2025):
  All in One SEO 4.7.9.1 con BlogPosting, BreadcrumbList, Person y Organization.
- Copia indexable en `blog-sky-h0gfh8acecdrdtav.eastus2-01.azurewebsites.net`: 200, canonical propio, sin noindex,
  fuera de Cloudflare.
- `blog.skyairline.com/robots.txt` 404; GSC sin sitemaps enviados; `www.skyairline.com/robots.txt` devuelve HTML.
- Rastreo desde la home: 636 de 1.700 posts alcanzables (37 %); paginación por AJAX.
- `/page/2/` declara canonical a `/2/`, que da 404.
- 3.052 enlaces internos al prefijo antiguo; 68 posts con el shortcode del CTA visible; 17 % de las guías de destino
  sin enlace a SKY.
- Móvil (laboratorio): LCP 5,7–20 s; sin datos de campo (PSI con cuota agotada).
- Superficie: `/wp-json/wp/v2/users` lista 4 usuarios; 1.411 posts firmados por «administrador».
- Sin spam inyectado ni cloaking (15/15 URL idénticas para Googlebot y navegador).

## Perú y contenido

- 241 posts de Perú; 17 destinos operados por SKY en Perú (API pública, 23-10). Ayacucho sin artículos en línea.
- Nueve posts vivos el 15-10 y en 404 el 23-10: `catedral-de-tacna`, `mercado-central-de-tacna`,
  `como-llegar-a-ayacucho`, `viajes-cusco`, `volcan-chachani`, `viajar-a-peru`, `verano-en-peru`,
  `mejor-comida-peruana`, `musica-tipica-peruana`. En el mismo periodo aparecieron 12 posts nuevos.

## Valor publicitario equivalente

- Hoy US$ 6.000–16.000/mes (Semrush CL+PE · GSC × CPC extrapolado); antes de migrar US$ 28.000–45.000/mes.
- 71 % del valor medido es de marca (equipaje, check-in, SKY Plus). Cobertura sin extrapolar: 13,3 %.
- Delta 05-11-2026: con la propiedad `www` el rango previo real da ≈US$ 43–61 mil/mes y la marca pesaba 49–52 %
  antes de migrar. Ver «Hechos del 05-11» al final; las cifras de arriba se conservan como lo enviado el 23-10.

## Escenarios (estimación de Efeonce, no compromiso)

Tabla del 23-10. El 05-11 «sin intervenir» pasó a la caída medida de oct-2026 (−43 %): ver «Hechos del 05-11».

| | Nov 2026 | Dic 2026 | Ene 2027 |
| --- | --- | --- | --- |
| Año anterior (observado) | 44.000 | 49.500 | 67.900 |
| Sin intervenir (−35 % interanual) | 28.000 | 32.000 | 44.000 |
| Base | 44.000 | 48.000 | 65.000 |
| Estructural | 48.000 | 55.000 | 72.000 (≈75 mil/mes durante 2027) |

## Gasto de datos

DataForSEO: 6 tareas SERP (≈US$ 0,012). Semrush por API dentro del plan.

## Hechos del 05-11-2026 (proyección a 24 meses)

Corte: GA4 al 04-11-2026, GSC final hasta oct-2026, Semrush oct-2026. Estas cifras actualizan las anteriores sin
reescribirlas; el uso en el informe está en [PROYECCION_2026-11.md](PROYECCION_2026-11.md). Datos crudos (no
versionados): `outputs/sky-blog-proyeccion-2026-11/{modelo,ga4,valor,informe}/`.

### Tráfico (GA4, orgánico del blog, ambos hosts deduplicados)

| Momento | Sesiones |
| --- | --- |
| Oct-2026 cerrado | 24.351 (vs 42.585 en oct-2025: −43 %) |
| Nov-2026, días 1–4 | 2.546 (vs 5.824: −56 %) |

- La serie GA4 del blog empieza en jul-2023. El −35,6 % de oct 1–21 queda reemplazado por el mes cerrado.

### Conversión (GA4, evento clave `purchase`)

- `vpv_bv` también es evento clave e infla la tasa genérica: no se usa.
- Personas que vieron el blog y compraron ese mismo mes: ≈2.350/mes en ene–sep 2025 y ≈1.000/mes en ene–oct 2026
  (774 en oct-2026). Su tasa de compra: 2,1–2,7 % en 2026 y 1,4–2,4 % antes de migrar.
- Sesiones que entran por el blog y compran en esa sesión: 0,25 %, contra 2,7 % del sitio (oct-2026).
- `purchase` no trae monto: todas las métricas de ingresos están en 0 en la propiedad. No hay ingresos por blog.
- Pasar del blog a skyairline.com no abre otra sesión; los dominios cruzados no son un problema.
- Es coincidencia en el mes, no atribución, y es un piso (no cubre cambio de dispositivo ni cookies rechazadas).

### Search Console

- La propiedad `https://www.skyairline.com/` es legible con el token de la conexión (`siteFullUser`). Se exportó el
  05-11 filtrada a `/blog/`: primer día conservado 24-06-2025; ene–may 2025 ya no existe en GSC.
  Archivos: `outputs/sky-blog-proyeccion-2026-11/valor/historia-www-blog-*.csv`.
- Con filtro de página, la dimensión país sólo devuelve clics con consulta visible (oct-2026: 7.433 de 24.965). El
  reparto por país del blog sale del total de la propiedad sin filtro; en `www`/blog el reparto es sólo de los
  clics con consulta visible. La columna `country_basis` del CSV indica la base.

### Valor publicitario equivalente (`gsc_clicks_country_cpc_v1`, Chile + Perú)

| | Ago–oct 2026 (blog) | Jul–sep 2025 (`www`/blog) | Cambio |
| --- | --- | --- | --- |
| Medido, US$/mes | 2.107 | 7.406 | −72 % |
| Sin marca medido, US$/mes | ≈700 | ≈3.700 | −81 % |
| Peso de marca | 66–70 % | 49–52 % | — |
| Cobertura de valoración | 12–15 % | 13,8–14,3 % | — |
| Extrapolado (no canónico), US$/mes | ≈15.600 | ≈52.400 (ago-25: 52.993) | — |

- Con datos reales, el rango previo a la migración da ≈US$ 43–61 mil/mes, contra los 28–45 mil publicados el 23-10.
  El informe de la proyección mantiene 28–45 mil por consistencia, así que el repago queda conservador.
- Por tema (valor medido, jul–sep 2025 → ago–oct 2026): equipaje −58 %, destinos Chile −82 %, internacionales
  −83 %, destinos Perú −92 %, mascotas −33 %.
- Los valores de 2025 son revaloración a CPC de hoy, no precios de esa época.

### Semrush (traffic cost, ambos hosts, CL + PE)

- Pico US$ 30–40 mil/mes entre may-2024 y may-2025 (máximo ene-2025: 40.283).
- Ya bajaba antes de migrar: ago-2025 28.529, sep-2025 25.448. Después: oct-2025 12.406, sep-2026 6.089,
  oct-2026 4.868.

### Escenario «sin intervenir»

- Usa la caída interanual medida de oct-2026 (−43 %) en vez del −35 % fijo: enero de 2027 sin intervenir pasa a
  38.850 (antes 44.161). Base y estructural no cambian.

### Gasto de datos

- DataForSEO: 29 tareas `keyword_overview`, 19.239 keywords, US$ 1,525 real (estimado 2,66). Persistidas el 05-11
  con el writer canónico en `greenhouse_growth.seo_keyword_market_data`: 19.239 filas, 4.987 con CPC, verificadas
  por lectura. Recibos en `outputs/sky-blog-proyeccion-2026-11/valor/dataforseo/` (~300 MB, no versionar).
- Semrush: 4 llamadas dentro del plan.
