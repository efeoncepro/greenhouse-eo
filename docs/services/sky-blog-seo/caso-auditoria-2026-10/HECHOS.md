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

## Escenarios (estimación de Efeonce, no compromiso)

| | Nov 2026 | Dic 2026 | Ene 2027 |
| --- | --- | --- | --- |
| Año anterior (observado) | 44.000 | 49.500 | 67.900 |
| Sin intervenir (−35 % interanual) | 28.000 | 32.000 | 44.000 |
| Base | 44.000 | 48.000 | 65.000 |
| Estructural | 48.000 | 55.000 | 72.000 (≈75 mil/mes durante 2027) |

## Gasto de datos

DataForSEO: 6 tareas SERP (≈US$ 0,012). Semrush por API dentro del plan.
