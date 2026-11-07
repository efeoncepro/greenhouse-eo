# GA4 — Blog SKY: serie orgánica e impacto en conversión (proyección 2026-11)

Datos consultados el **05-11-2026** (read-only) en la propiedad `354430952` («SKY web GA4 - Prod», zona
America/Santiago, moneda USD, un solo web stream `https://www.skyairline.com`). Se usó la conexión OAuth de la
organización SKY (`org-b9977f96-…`, scope `analytics.readonly`), con el cliente OAuth cargado sólo en el entorno del
proceso. Nada se escribió en GA4, Notion, HubSpot, Insights ni en otro sistema. Las respuestas crudas están en `raw/`.

## 1. Definiciones y filtros

| Concepto | Filtro Data API |
|---|---|
| Blog, ambos hosts | `hostName = blog.skyairline.com` **OR** (`hostName = www.skyairline.com` **AND** `pagePath` FULL_REGEXP `^/blog(/.*)?$`). Es el mismo filtro de la auditoría 2026-10-23 |
| Orgánico | `sessionDefaultChannelGroup = Organic Search` |
| Deduplicación | Una sola consulta con el OR. `sessions` con filtro de evento cuenta cada sesión con ≥1 evento en el blog una vez, aunque haya tocado ambos hosts |
| Primer dato | El blog aparece en la propiedad en **2023-07** (primer mes, posiblemente parcial). No hay datos de 2023-01 a 06 |
| Noviembre 2026 | 1 al 4 de noviembre (parcial) |

**Corrección del split por país.** Una consulta `yearMonth × country` sobre todo el rango devuelve
`metadata.dataLossFromOtherRow = true`: parte de las filas cae en «(other)», y la suma por país queda entre 3 % y
25 % bajo el total. La auditoría 2026-10-23 usó esa forma, así que su split por país está subestimado. Por ejemplo,
Chile en ene-2025 da 73.640 en la consulta larga y 90.274 consultando el mes solo. Aquí cada mes se consulta por
separado (`specs-06`). Desde 2024-10 esas consultas no traen la marca de pérdida y la suma por país queda a ±4 % del
total (estimación HyperLogLog). Entre 2023-07 y 2024-09 la marca sigue apareciendo, aunque la suma cuadra a ±10 %; la
columna `ga4_dataLossFromOtherRow` lo indica fila a fila.

## 2. Reconciliación

| Referencia | Esperado | Obtenido el 05-11 | Consulta |
|---|---:|---:|---|
| Ene-2025 | 208.099 | 208.099 | `series-organic-scope-monthly` |
| Sep-2025 | 75.506 | 75.506 | idem |
| Oct-2025 | 42.585 | 42.585 | idem |
| Ene-2026 | 67.940 | 67.940 | idem |
| Sep-2026 | 28.954 | 28.954 | idem |
| 1-21 oct 2026 | 18.669 | 18.669 | `series-reconcile-windows` |
| 1-21 oct 2025 | 28.994 | 28.994 | idem |

Cuadran todas sin cambiar la definición. Las sumas por mes de las consultas por bloques (`pm-organic-total-*`)
también coinciden exactamente con la serie.

**Octubre 2026 completo: 24.351 sesiones orgánicas, −42,8 % contra oct-2025 (42.585).** Fórmula:
24.351 / 42.585 − 1. Del 1 al 4 de noviembre hay 2.546, contra 5.824 en el mismo tramo de 2025 (−56,3 %).

## 3. Tablas de tráfico

| Archivo | Contenido |
|---|---|
| `blog_organic_sessions_monthly.csv` | Orgánico deduplicado, engaged, usuarios, vistas, split por host, variación interanual. 2023-07 a 2026-11 (1-4) |
| `blog_organic_sessions_by_country_monthly.csv` | Orgánico por país (Chile, Perú, Argentina, Brasil, Other) y participaciones; una consulta por mes |
| `blog_sessions_by_channel_monthly.csv` | Sesiones del blog por canal, todos los canales; consultas por bloques de 4 meses |
| `blog_sessions_all_channels_monthly.csv` | Total del blog en todos los canales (consulta deduplicada) y participación orgánica |
| `blog_events_monthly_all_channels.csv`, `blog_link_clicks_by_domain_monthly.csv` | Eventos y clics de salida desde el blog, de la captura de la auditoría (hasta el 21-10-2026) |

| Mes | 2024 | 2025 | 2026 |
|---|---:|---:|---:|
| Ene | 152.090 | 208.099 | 67.940 |
| Feb | 152.039 | 157.403 | 56.922 |
| Mar | 140.238 | 116.320 | 42.331 |
| Abr | 132.550 | 94.468 | 32.491 |
| May | 144.911 | 94.104 | 35.033 |
| Jun | 223.915 | 99.430 | 35.978 |
| Jul | 195.707 | 110.878 | 33.959 |
| Ago | 185.754 | 95.710 | 29.768 |
| Sep | 183.788 | 75.506 | 28.954 |
| Oct | 186.079 | 42.585 | **24.351** |
| Nov | 157.911 | 43.973 | 2.546 (1-4) |
| Dic | 158.689 | 49.543 | — |

En 2023: jul 65.077, ago 96.043, sep 92.922, oct 98.126, nov 109.065, dic 113.153.

País, orgánico, consulta por mes: ene-2025 Chile 90.274 (42,8 %), Perú 37.285 (17,7 %), Argentina 32.895 (15,6 %),
Brasil 4.629 (2,2 %), otros 45.809. Sep-2026 Chile 15.814 (55,3 %), Perú 7.794 (27,3 %), Argentina 1.462, Brasil 301,
otros 3.208. Oct-2026 Chile 13.950 (56,9 %), Perú 6.611 (26,9 %), Argentina 1.030, Brasil 255, otros 2.691.

Todos los canales: oct-2025 56.626 (orgánico 75,2 %), oct-2026 34.628 (70,3 %), 1-4 nov 2026 3.295.

## 4. Conversión: qué mide GA4

### 4.1 Inventario de la propiedad

- **Key events:** `purchase` (desde 2023-02) y `vpv_bv` (desde 2024-07). `vpv_bv` acumula 178,7 M de eventos entre
  ene-2025 y oct-2026 y domina el `keyEvents` total (≈ 41 % de las sesiones tienen un key event). Por eso todo el
  análisis usa la variante `:purchase`.
- **Compras:** el evento `purchase` registra unas 200.000 por mes en el sitio (oct-2026: 264.421). Llega sobre todo
  desde `initial-sale.skyairline.com` (motor de reservas), además de `mmb.` y `empresas.` y 1,67 M con
  `hostName = (not set)`, probablemente server-side.
- **Ingresos: no medibles.** `purchaseRevenue`, `totalRevenue`, `grossPurchaseRevenue`, `itemRevenue` y
  `eventValue` valen 0 en todos los meses. La compra no envía valor ni ítems a GA4, así que el ingreso por sesión no
  se puede calcular con esta propiedad, ni para el blog ni para el sitio.
- El blog y el motor de reservas son subdominios de `skyairline.com` en la misma propiedad, con cookie compartida.
  No hay sesiones con `sessionSource = blog.skyairline.com`, lo que indica que pasar del blog al sitio no abre una
  sesión nueva por auto-referral.

### 4.2 (a) y (d): sesiones con landing en el blog que compran en la misma sesión

`landingPage` es una dimensión de sesión, sin host:
- Hasta sep-2025 (era www) el blog se identifica con `^/blog`.
- Desde oct-2025 se usan 2.236 rutas cuya proporción de sesiones con evento en `blog.skyairline.com` es ≥ 95 %
  (`classify_blog_landings.py`). Quedan fuera rutas ambiguas como `/`, por lo que este conteo es conservador.

Tasa de compra por sesión = sesiones con ≥ 1 `purchase` / sesiones (`sessionKeyEventRate:purchase`).

| Período | Sesiones con landing en el blog | `purchase` | Tasa blog | Tasa del sitio | Blog / sitio |
|---|---:|---:|---:|---:|---:|
| ene–sep 2025 | 1.274.458 | 2.553 | 0,20 % | 2,36 % | ≈ 0,09 |
| oct-2025–oct-2026 | 563.318 | 1.413 | 0,25 % | 3,12 % | ≈ 0,08 |
| oct-2026 | 27.396 | 79 | 0,245 % | 2,74 % | 0,089 |

Tasa por período = Σ eventos `purchase` / Σ sesiones; es una aproximación a la tasa de sesión, porque una sesión
puede tener más de un `purchase`. Contra el sitio orgánico (oct-2026: 3,72 %), la diferencia es mayor.

Por país, oct-2025–oct-2026, tasa blog contra tasa sitio: Chile 0,19 % / 2,23 %, Perú 0,16 % / 1,67 %, Argentina
0,13 % / 1,08 %, Brasil 0,34 % / 0,91 % (7.021 sesiones). Detalle en
`conversion_blog_landing_vs_site_monthly.csv` y `conversion_blog_landing_vs_site_by_country_monthly.csv`.

### 4.3 (b) Usuarios que vieron el blog y compraron después en el mismo mes

Se usó un funnel cerrado, Data API v1alpha `runFunnelReport`, a nivel de usuario. Paso 1: un evento con
`pageLocation` del blog en cualquiera de los dos hosts (la API no acepta `pagePath` en pasos de funnel). Paso 2:
`purchase` posterior dentro del mismo mes. Hay tres variantes: cualquier canal, paso 1 orgánico y compra ≤ 30 min
después de la vista del blog.

| Mes | Vieron el blog | Compraron después | Tasa | Orgánico: compraron | ≤ 30 min | Tasa compradores del sitio |
|---|---:|---:|---:|---:|---:|---:|
| ene-2025 | 252.270 | 3.616 | 1,43 % | 2.036 | 652 | 1,53 % |
| sep-2026 | 31.307 | 703 | 2,25 % | 434 | 170 | 4,87 % |
| oct-2026 | 29.021 | 774 | 2,67 % | 411 | 194 | 4,50 % |

Totales: 24.578 usuarios en 2025 y 10.130 entre ene y oct-2026 (orgánico: 14.558 y 6.527; ≤ 30 min: 5.300 y 2.336).
Tasa de compradores del sitio = `totalPurchasers / activeUsers` del mes. Oct-2026 por país: Chile 459 de 15.376
(2,99 %) contra 5,74 % en el sitio; Perú 267 de 7.094 (3,76 %) contra 4,24 %. Brasil no entra en el desglose de 6
países del funnel. Archivo: `conversion_funnel_blog_users_then_purchase_monthly.csv`.

Esto prueba coincidencia, no causalidad: son usuarios que leyeron el blog y luego compraron, muchos de los cuales ya
iban a comprar. Tampoco es atribución.

### 4.4 (c) Navegación del blog al sitio

- **Por referrer:** vistas de página fuera del blog con `pageReferrer` del blog. Oct-2025 1.327; nov 6.208;
  dic 7.668; ene-2026 9.361; luego entre 4.000 y 7.400 por mes (oct-2026: 4.175). El 92 % va a `/flights/es-cl/`
  (71.312 en el período). Ninguna llega con ese referrer a `initial-sale.` (motor de reservas). Archivos:
  `navigation_blog_referrer_to_site_monthly.csv` y `navigation_blog_referrer_top_www_pages.csv`.
- **Por clics de salida** (captura de la auditoría): de 13.000 a 40.000 eventos `click` por mes hacia
  `skyairline.com`. Son 2 a 4 veces las vistas con referrer; la diferencia no se pudo explicar con estos datos.
  Antes de sep-2025 los dos indicadores no se pueden comparar con los posteriores: el blog era interno en www, el
  clic no se registraba como salida y el referrer era el mismo host.

### 4.5 Lo que no es medible y por qué

1. **Ingresos e ingreso por sesión:** la propiedad no recibe valor de compra (todas las métricas de revenue en 0).
2. **Compras atribuidas al blog:** atribución data-driven con ventana de 30 días en la UI; la Data API no expone
   conversiones asistidas por página. Lo medido son coincidencias (misma sesión o mismo mes), no causalidad.
3. **Usuarios entre dispositivos o con cookies borradas o rechazadas:** el funnel depende de la cookie o `user_id`;
   consent mode y bloqueadores cortan la relación, así que los conteos son un piso.
4. **Ruta exacta blog → reserva:** el referrer se pierde a partir de la página de vuelos, y no hay vistas con
   referrer del blog en `initial-sale.`.
5. **Brasil en los funnels:** queda fuera del límite de 6 países del desglose.

## 5. Scripts y comandos

Hay que correrlos desde la raíz del repo, con el proxy Cloud SQL en `127.0.0.1:15432` y el cliente OAuth GA4 cargado
sólo en el proceso (`set -a; . <archivo .env fuera del repo>; set +a`):

```bash
G=outputs/sky-blog-proyeccion-2026-11/ga4
R="pnpm exec tsx --require ./scripts/lib/server-only-shim.cjs $G/ga4q.ts"
$R $G/specs-00-discovery.mjs $G/raw     # propiedad, key events, streams, metadata, eventos, hosts
$R $G/specs-01-series.mjs $G/raw        # series 2023-01..2026-11-04 y reconciliación
$R $G/specs-02-conversion.mjs $G/raw    # sitio, landing era www, referrer, auto-referral, 66 funnels
python3 -I $G/classify_blog_landings.py  # → blog_landing_paths.json
$R $G/specs-03-blog-landing-era2.mjs $G/raw   # landing era blog.skyairline.com + compradores del sitio
$R $G/specs-04-country-fix.mjs $G/raw   # diagnóstico de la pérdida "(other)"
$R $G/specs-05-per-month.mjs $G/raw     # por bloques: total, canal, conversión por país
$R $G/specs-06-country-single-month.mjs $G/raw  # país, un mes por consulta
python3 -I $G/build_tables.py           # CSV de tráfico y conversión
python3 -I $G/build_from_audit_raw.py   # eventos y clics desde la captura de la auditoría
```

`ga4q.ts` sólo hace `runReport`, `runFunnelReport` y GET de Admin y metadata. Guarda cada respuesta en
`raw/<nombre>.json` y no repite las que ya existen.
