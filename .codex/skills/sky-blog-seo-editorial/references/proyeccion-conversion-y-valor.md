# Proyección, conversión y valor del tráfico del Blog SKY

Este método sale del pedido del kickoff SKY del 02-11-2026 (Pilar Romero): saber cuándo vuelve el blog a su mejor nivel en tráfico y en repago, y cuánto aporta a la venta. Se ejecutó el 05-11-2026; el caso está en `docs/services/sky-blog-seo/caso-auditoria-2026-10/PROYECCION_2026-11.md` y `HECHOS.md` (§Hechos del 05-11).
Los datos y scripts viven en `outputs/sky-blog-proyeccion-2026-11/{ga4,modelo,valor,informe}/`: los scripts, el modelo y el plan del informe están versionados; los datos crudos (`raw/`) y los CSV pesados quedan fuera de git. El generador del informe está en `scripts/seo/sky-blog-projection-report.ts`.

## 1. Qué responde y qué no

| Pregunta | Respuesta del método | Pieza |
| --- | --- | --- |
| ¿Cuánto tráfico se recupera y cuándo? | Tasa de recuperación R por mes y escenarios a 24 meses, con hitos R ≥ 0,50 / 0,75 / 0,90 | `modelo/` |
| ¿Cuánto vende el blog? | Personas que leen y compran en el mes, compra en la misma sesión y navegación hacia skyairline.com | `ga4/` |
| ¿Cuánto costaría ese tráfico en Google Ads? | Valor publicitario equivalente `gsc_clicks_country_cpc_v1`, desglosado por búsqueda y tema | `valor/` |
| ¿Cuánto repaga el servicio? | Valor proyectado ÷ honorario mensual: «cubre N veces el honorario» | `modelo/` |

**Qué NO responde:**
- No mide ahorro, ingresos, ROI, rentabilidad ni causalidad atribuible a Efeonce. El valor es lo que costaría comprar en Google Ads los clics orgánicos observados, a precios de mercado estimados (`docs/services/sky-blog-seo/INDICADOR_VALOR_ORGANICO_V1.md`).
- No mide ingresos por blog: en la propiedad GA4 de SKY el evento `purchase` llega sin monto.
- No es un compromiso. Son estimaciones para alinear expectativas y se revisan con cada cierre mensual.
- No suma visitas GA4 con clics GSC: miden cosas distintas.

## 2. Datos

### 2.1 GA4 (propiedad `354430952`, «SKY web GA4 - Prod», zona America/Santiago, USD)

**Acceso usado en noviembre de 2026.** Se usó la conexión OAuth de la organización SKY (`org-b9977f96-f7ef-4afb-bb26-7355d78c981f`, scope `analytics.readonly`), a través del runner `ga4/ga4q.ts`. El runner es de solo lectura (`runReport`, `runFunnelReport` v1alpha, GET de Admin y metadata), necesita el proxy Cloud SQL en `127.0.0.1:15432` y recibe el cliente OAuth sólo en el entorno del proceso. Guarda cada respuesta en `raw/<nombre>.json` y no repite las que ya existen.

**Acceso recomendado.** Es `pnpm ga4:query` (`scripts/ga4/query.ts`, manual `docs/manual-de-uso/growth/consultar-ga4-por-cli.md`). Funciona con ADC de gcloud, que impersona `greenhouse-gtm-publisher@efeonce-group.iam.gserviceaccount.com`, y la cuenta puede cambiarse con `GA4_QUERY_SERVICE_ACCOUNT`. No lee `.env.local`, PostgreSQL ni Secret Manager. Al 05-11 **no tenía acceso a SKY**: falta que SKY agregue esa cuenta como Lector (se pidió en el correo). Antes de cualquier consulta, corre `pnpm ga4:query doctor --property sky`.

**Filtros (`ga4/lib.mjs`, los mismos de la auditoría del 23-10):**

| Concepto | Filtro |
| --- | --- |
| Blog en ambos hosts | `hostName = blog.skyairline.com` OR (`hostName = www.skyairline.com` AND `pagePath` FULL_REGEXP `^/blog(/.*)?$`), en una sola consulta para deduplicar |
| Canal | `sessionDefaultChannelGroup = Organic Search` |
| Paso «blog» de un embudo | `pageLocation` FULL_REGEXP `^https?://(blog\.skyairline\.com\|www\.skyairline\.com/blog)([/?#].*)?$`, porque los pasos de embudo no aceptan `pagePath` |
| Conversión | Sólo `purchase` (variante `:purchase`). El evento clave `vpv_bv` infla la tasa genérica |

**Specs, en orden:**

| Spec | Qué consulta |
| --- | --- |
| `specs-00-discovery.mjs` | Propiedad, eventos clave, streams, metadata, eventos y hosts. Usa `kind: 'get'`, propio de `ga4q.ts` |
| `specs-01-series.mjs` | Serie mensual desde 2023-01-01 hasta el corte (por host, país y canal) y ventanas de reconciliación |
| `specs-02-conversion.mjs` | Sitio, landing de la era `www`, referrer, auto-referral y 66 embudos |
| `classify_blog_landings.py` | Clasifica `landingPage` (no trae host). Una ruta es «del blog» si ≥ 95 % de sus sesiones tocan `blog.skyairline.com`; excluye `/` y `(not set)`. Escribe `blog_landing_paths.json` |
| `specs-03-blog-landing-era2.mjs` | Landing de la era `blog.skyairline.com` y compradores del sitio |
| `specs-04-country-fix.mjs` | Diagnóstico de la pérdida en «(other)» |
| `specs-05-per-month.mjs` | Total, canal y conversión por país, en bloques de 4 meses |
| `specs-06-country-single-month.mjs` | País, una consulta por mes |
| `build_tables.py`, `build_from_audit_raw.py` | CSV de tráfico y conversión, más eventos y clics de salida de la captura de la auditoría |

**País.** Pide cada mes por separado. Una consulta `yearMonth × country` sobre el rango completo devuelve `dataLossFromOtherRow = true` y deja el reparto por país entre 3 % y 25 % bajo el total. La columna `ga4_dataLossFromOtherRow` marca la calidad de cada fila.

**Controles de reconciliación (05-11).** La serie debe reproducir sin cambiar la definición: ene-2025 208.099 · sep-2025 75.506 · oct-2025 42.585 · ene-2026 67.940 · sep-2026 28.954 · 1–21 oct 2026 18.669.

### 2.2 Search Console

| Propiedad | Uso | Condiciones |
| --- | --- | --- |
| `https://blog.skyairline.com/` (la conectada a la organización) | Hoy (desde el 24-09-2025) | `type=web`, `aggregationType=byPage`; el valor usa `dataState=final` |
| `https://www.skyairline.com/` filtrada a `^https?://www.skyairline.com/blog(/\|$)` | Antes de la migración | Visible con el token de la conexión (`siteFullUser`, comprobado con `sites.list` el 05-11) |

- **Histórico previo a la migración.** GSC guarda 16 meses. El primer día disponible de `www` era el 24-06-2025, y enero–mayo de 2025 ya no existen. El 05-11 se exportó a `valor/historia-www-blog-*.csv` (diario total/marca/sin marca, diario × país, página × mes, página × consulta × país × mes). Esa exportación vence entre noviembre de 2026 y enero de 2027.
- **Página × consulta × país.** Se usa toda la paginación disponible. Un control independiente sin consulta da el total, y el total nunca se reconstruye sumando consultas.
- **País.** Con filtro de página, la dimensión país sólo devuelve clics con consulta visible (oct-2026: 7.433 de 24.965).
  - En el blog, el reparto por país sale de la propiedad sin filtro.
  - En `www`/blog sólo existe el reparto de clics visibles.
  - La columna `country_basis` de `gsc-serie-mensual.csv` declara la base de cada fila.
- **Marca.** Regla de SKY `\bsky\b|skyairlines?`, sin distinguir mayúsculas. «sky plus» y «sky equipaje» cuentan como marca. `anonymized_residual` = total − marca − sin marca.
- La serie mensual (`02-monthly-series.ts`) usa `dataState=all`, así que el mes en curso es provisional.

### 2.3 CPC y contexto de mercado

- **CPC.** DataForSEO Labs `keyword_overview/live`, mismo país e idioma `es` (Chile 2152, Perú 2604). Se lee primero el snapshot canónico `greenhouse_growth.seo_keyword_market_data`. Sólo se compra lo que falta, con la CLI `pnpm dataforseo`: primero `--dry-run`, luego `--yes`, con `--estimated-usd` y `--max-usd`.
- **Semrush `resource_rank_history`.** 4 llamadas por MCP (≈2.400 unidades), ambos hosts, bases CL y PE. Es ETV modelado × CPC: sirve sólo de contexto y nunca se suma ni se promedia con el valor GSC.

### 2.4 Ventanas y calendarios

| Serie | Ventana del 05-11 | Calendario |
| --- | --- | --- |
| GA4 tráfico | 2023-07 (primer mes con blog) a 2026-11-04 | Mes calendario, America/Santiago |
| Conversión GA4 | ene-2025 a oct-2026; landing era 2 desde 2025-10-01 | Mes calendario; embudo dentro del mismo mes |
| Valor «hoy» | ago, sep y oct 2026 completos | Mes GSC (PT), `dataState=final` |
| Valor «antes» | jul–sep 2025 en `www`/blog (sep 1–25 = mes previo a migrar) | Mes GSC (PT) |

Las ventanas están escritas a mano en los specs (por ejemplo, `FULL` termina en `2026-11-04` en `specs-01-series.mjs`). **Edítalas antes de cada corrida.**

## 3. Modelo de proyección (`modelo/proyeccion.py`)

**Entrada.** `modelo/serie_ga4.json`: `sessions` mensuales desde ene-2024 (orgánico, blog en ambos hosts) y `usd_clp`. Ningún script lo regenera. Agrégale a mano cada mes cerrado desde `ga4/blog_organic_sessions_monthly.csv` y actualiza `nota_octubre_2026`/`fuente`.

**Base: tasa de recuperación R.**
- R = visitas orgánicas del mes ÷ las del mismo mes de 2025, antes de migrar. Así la estacionalidad (el pico de enero) entra por el mismo mes del año anterior.
- En 2026 (ene–sep), R osciló entre 0,306 y 0,383, con media `R_MEAN` = 0,348.
- Referencia R = 1 (`REF`): ene–sep son los meses observados de 2025. Oct = oct-2026 ÷ `R_MEAN` (≈ 70.000). Nov y dic siguen el mismo paso estacional nov-25/oct-25 y dic-25/oct-25.
- 2024 (168.000 de promedio mensual) queda como referencia histórica, no como meta.

**Parámetros vigentes (resumen en `resumen_modelo.json`):**

| Parámetro | Valor |
| --- | --- |
| Horizonte `H` | 24 meses; `i = 0` es noviembre de 2026 (`T0 = len(sessions)`) |
| `R_NOW` | R de octubre de 2026 = 0,348 |
| `NO_ACTION_YOY` | oct-26 ÷ oct-25 = 24.351 / 42.585 (−42,8 %) |
| Valor por visita | US$ 28.000 / 95.710 = 0,293 y 45.000 / 95.710 = 0,470 (agosto de 2025) |
| Honorario | CLP 3.000.000 ÷ 980,9 = US$ 3.058/mes |
| `BASE_LATE_JAN_R` | 0,265 (arreglos en diciembre: enero ≈ 55.146) |

**Escenarios:**

| Escenario | Trayectoria |
| --- | --- |
| Sin intervenir | Los primeros 12 meses, el mismo mes del año anterior × `NO_ACTION_YOY`; en 2028, −20 % sobre lo proyectado (× 0,80) |
| Base | `i=0` R_NOW · `i=1` 0,38 · `i=2` (enero) 0,31 · rampa lineal de 0,33 a 0,42 entre `i=2` e `i=11` · rampa de 0,42 a 0,50 hasta `i=23`, el techo supuesto del subdominio |
| Estructural bajo / alto | Igual que la base hasta `i=4` (marzo de 2027, proxy inverso a skyairline.com/blog); rampa hasta 0,75 / 0,95 en `i=12`; luego hasta `min(1, techo + 0,05)` |

- **Salidas.** `proyeccion_mensual.csv` trae por escenario visitas, R, valor bajo y alto, y cobertura del honorario. `resumen_modelo.json` trae los hitos: primer mes con R ≥ 0,50 / 0,75 / 0,90, enero de 2027 y de 2028, y promedios abr–sep.
- **Supuestos que mueven fechas** (página «límites» del informe):
  - arreglos técnicos en producción antes del 20-11;
  - proxy inverso en marzo de 2027;
  - Google no amplía mucho más las respuestas de IA en búsquedas de viaje;
  - GA4 no cuenta ingresos.

**Cómo recalibrar el próximo trimestre:**
1. Agrega a `serie_ga4.json` los meses cerrados. No uses meses parciales extrapolados: el 05-11 el 27.560 extrapolado se reemplazó por 24.351 y cambió «sin intervenir».
2. Los índices están fijos a noviembre de 2026 y hay que moverlos a mano. Son: `R_2026 = range(9)`, `REF[9]` (octubre), `fixed = {0,1,2}` en `r_base`, el corte `i <= 4` del estructural y los hitos `paths[name][2]` (enero de 2027), `[14]` (enero de 2028), `[5:11]` y `[17:23]`. Si sólo agregas meses a la serie, `T0` avanza y los hitos dejan de apuntar al mes que dicen.
3. Compara la R observada contra la trayectoria de cada escenario y reescribe la del mes en curso según lo que esté en producción. El 05-11 la base de nov/dic bajó a la tasa actual porque la configuración SEO no estaba en producción (corrigió los 44.000 y 48.000 del 23-10).
4. Lectura interna: el pico de enero puede ser estacional (en 2025 y en 2026 la caída ene-feb → ago-sep fue la misma, −53 %). Antes de celebrar enero, revisa en GSC los clics sin marca y su posición, y valida con abr–sep 2027.

## 4. Conversión y aporte a la venta

Son tres lecturas, todas de coincidencia y no de atribución. Todas son un piso, porque no cubren cambio de dispositivo ni cookies rechazadas o borradas.

| Lectura | Cómo se mide | Archivo |
| --- | --- | --- |
| (b) Lectores que compran en el mes | Embudo cerrado `runFunnelReport` por usuario: paso 1 una vista del blog, paso 2 un `purchase` posterior en el mismo mes. Variantes: cualquier canal, paso 1 orgánico y compra ≤ 30 min. Tasa del sitio = `totalPurchasers / activeUsers` | `conversion_funnel_blog_users_then_purchase_monthly.csv` |
| (a)/(d) Compra en la sesión que entra por el blog | `landingPage` `^/blog` hasta sep-2025 y las rutas de `blog_landing_paths.json` desde oct-2025. Tasa = Σ `purchase` / Σ sesiones (aproxima `sessionKeyEventRate:purchase`), contra el sitio, también por país | `conversion_blog_landing_vs_site_*.csv` |
| (c) Navegación al sitio | Vistas fuera del blog con `pageReferrer` del blog, más clics de salida hacia `skyairline.com` (captura de la auditoría) | `navigation_blog_referrer_*.csv`, `blog_link_clicks_by_domain_monthly.csv` |

**Límites verificados el 05-11:**
- `purchaseRevenue`, `totalRevenue`, `grossPurchaseRevenue`, `itemRevenue` y `eventValue` valen 0 en toda la propiedad, así que no hay ingresos.
- La Data API no expone conversiones asistidas por página.
- El referrer se pierde en la página de vuelos: no hay vistas con referrer del blog en `initial-sale.`.
- Brasil queda fuera del límite de 6 países del desglose de embudos.
- Antes de sep-2025, clics de salida y referrer no son comparables con los posteriores, porque el blog vivía dentro de `www`.
- Pasar del blog al sitio no abre otra sesión: no hay sesiones con `sessionSource = blog.skyairline.com`.

**Mensaje para el cliente.** Lo que bajó es la cantidad de lectores, no su tasa de compra. Recuperar tráfico es también recuperar compradores. La página «medir-venta» del informe propone 4 pasos: monto en `purchase`, clic a ruta como evento clave, UTM en los banners de ruta y un cuadro mensual de aporte a la venta.

## 5. Valorización frente a Google Ads

**Fórmula canónica:** `valor USD = Σ(clics GSC página × consulta × país × CPC USD de esa consulta y país)`. Se multiplica fila por fila, sin redondeos intermedios. El código está en `src/lib/growth/seo/organic-traffic-value/`:

| Pieza | Función |
| --- | --- |
| Extracción (propiedad conectada) | `collectOrganicTrafficValueInputs` (`collect.ts`) |
| Cálculo | `calculateOrganicTrafficValue` (`calculate.ts`, `ORGANIC_TRAFFIC_VALUE_METHOD = 'gsc_clicks_country_cpc_v1'`) |
| Lectura por ventana (Insights) | `readOrganicTrafficValueForWindow` (`read-for-window.ts`): sólo CPC ya capturados, nunca compra |
| CLI de operador | `scripts/seo/organic-traffic-value.ts` (manual `docs/manual-de-uso/growth/valorar-trafico-organico.md`) |

**Reglas:**
- **Cobertura.** Valoración = clics con consulta visible y CPC ÷ clics del control sin consulta. En ambos lados dio 12–15 %: el 66–70 % de los clics no muestra la consulta, y el resto son consultas sin CPC o de otros países. Publica siempre la cobertura junto al valor.
- **Piso, no total.** Sin CPC, el valor es `null`, «Sin valorar», y no US$ 0. Un CPC real de 0 se conserva. No extrapoles al resto ni multipliques todo el tráfico GA4 por un CPC promedio. El «extrapolado» (valor medido ÷ clics valorados × todos los clics, CPC implícito ≈ US$ 0,53–0,56) sólo se usa para reconciliar y se rotula «no canónico». El rango publicable es medido (piso) – extrapolado (techo).
- **Revalorización.** Los dos lados usan CPC capturados en oct–nov 2026. El valor de 2025 es a precios de hoy, no el precio de esa época. Muestra la fecha del CPC.
- **Antes de la migración.** El collector canónico sólo lee la propiedad conectada. `www` se extrae con `valor/scripts/03-www-collect.ts`, un espejo del collector, y se calcula con `calculateOrganicTrafficValue` sin cambios. Compara clics y valor, no posición media: las propiedades mezclan impresiones distintas.
- **Temas.** Se asignan con reglas de texto sobre la consulta, más el slug de la landing para destinos (`valor/scripts/08-tables.py`). Son orientativos y revisables: equipaje, check-in, mascotas, cambios, destinos Chile, destinos Perú, internacionales y tres «otros».
- **El valor del modelo no es el indicador.** El repago de §3 usa visitas GA4 × valor por visita de agosto de 2025, con un rango que sale del 23-10 (bajo: Semrush; alto: GSC extrapolado sin `www`). El 05-11, con `www`, el rango previo real dio ≈ US$ 43–61 mil. Se mantuvo 28–45 mil por consistencia con lo enviado, así que el repago queda conservador.

**Planilla para el cliente** (`valor/scripts/10-planilla-keywords.ts`, con ExcelJS). Lee los CSV de `08-tables.py` y escribe 4 hojas:
1. «Resumen por tema»: antes contra ahora.
2. «Búsquedas ago–oct 2026» (`desglose-keywords-blog-ago-oct-2026.csv`).
3. «Búsquedas jul–sep 2025» (`desglose-keywords-www-blog-jul-sep-2025.csv`).
4. «Cómo leerla»: método, revaloración, piso del 12–15 % y la aclaración «CPC vacío ≠ cero, no es ahorro ni retorno».

Cada fila de las hojas 2 y 3 trae búsqueda, país, marca, tema, clics del período y por mes, CPC, valor, página principal y fecha del CPC. Las filas se ordenan por valor, con autofiltro y fila fija. Los meses de cada hoja están escritos en el script: cámbialos al rotar períodos.

## 6. Cómo se entrega

| Pieza | Cómo se arma | Nombre usado el 05-11 |
| --- | --- | --- |
| Informe A4 (13 páginas: portada, índice, resumen, qué-es-volver, trayectoria, escenarios, hitos, valor, keywords, conversión, medir-venta, límites, contraportada) | `scripts/seo/sky-blog-projection-report.ts` escribe `informe/sky-blog-proyeccion.plan.json` con los datos del modelo, de `ga4/` y de `valor/keywords_report.json`. `pnpm report:compose` compone el PDF | «Efeonce - Proyección Blog SKY (05-11-2026).pdf» |
| Planilla | `10-planilla-keywords.ts <salida.xlsx>` | «Efeonce - Desglose de búsquedas valorizadas Blog SKY (05-11-2026).xlsx» |
| Correo | Borrador en `docs/services/sky-blog-seo/caso-auditoria-2026-10/correos/03-proyeccion-y-conversion.md`. Se envía por Outlook web con firma gráfica y CCO de HubSpot, según `docs/operations/EFEONCE_OUTLOOK_AGENT_SEND_POLICY_V1.md` | Asunto «Blog SKY: cuándo vuelve a su mejor nivel y cómo aporta a la venta» |

- **Carpeta del cliente:** OneDrive › Workspace › Clientes › Sky Airlines › `Proyección Blog <AAAA-MM>`. No va en la raíz de Sky Airlines ni en el canal compartido de SharePoint «Sky - Efeonce - General».
- **Copia interna:** Alineación › 1. Clientes (Interno) › Sky - SEO-AEO › `Proyección <AAAA-MM>`.
- Los adjuntos locales quedan en `outputs/sky-blog-proyeccion-2026-11/informe/adjuntos-correo/`.
- Antes de enviar, abre el PDF y la planilla y comprueba que las cifras cuadren con `resumen_modelo.json` y `valor-mensual-resumen.csv`. Después, confirma la copia en Enviados con los adjuntos y el CCO.

## 7. Regenerar todo, en orden

Todo se corre desde la raíz del repo, en bash. Antes de empezar, actualiza las fechas de los specs y de los scripts.

```bash
# 1. GA4 (proxy Cloud SQL en 127.0.0.1:15432 y cliente OAuth GA4 sólo en el proceso)
G=outputs/sky-blog-proyeccion-2026-11/ga4
R="pnpm exec tsx --require ./scripts/lib/server-only-shim.cjs $G/ga4q.ts"
$R $G/specs-00-discovery.mjs $G/raw
$R $G/specs-01-series.mjs $G/raw
$R $G/specs-02-conversion.mjs $G/raw
python3 -I $G/classify_blog_landings.py
$R $G/specs-03-blog-landing-era2.mjs $G/raw
$R $G/specs-04-country-fix.mjs $G/raw
$R $G/specs-05-per-month.mjs $G/raw
$R $G/specs-06-country-single-month.mjs $G/raw
python3 -I $G/build_tables.py
python3 -I $G/build_from_audit_raw.py

# 2. Modelo (antes, agrega a mano el mes cerrado a modelo/serie_ga4.json)
python3 -I outputs/sky-blog-proyeccion-2026-11/modelo/proyeccion.py

# 3. Search Console y valor
V=outputs/sky-blog-proyeccion-2026-11/valor
bash $V/scripts/run.sh $V/scripts/01-probe-sites.ts
bash $V/scripts/run.sh $V/scripts/02-monthly-series.ts
bash $V/scripts/run.sh $V/scripts/02b-country-probe.ts
bash $V/scripts/run.sh scripts/seo/organic-traffic-value.ts --org=org-b9977f96-f7ef-4afb-bb26-7355d78c981f \
  --site=https://blog.skyairline.com/ --host=blog.skyairline.com --from=2026-10-01 --to=2026-10-31 \
  --save-input=$V/raw/gsc-inputs-blog-2026-10.json --out=$V/canonical/valor-blog-2026-10-pre-compra.json
bash $V/scripts/run.sh $V/scripts/03-www-collect.ts
pnpm exec tsx --require ./scripts/lib/server-only-shim.cjs $V/scripts/04-cpc-plan.ts \
  blog-2026-08,blog-2026-09,blog-2026-10,www-blog-2025-07,www-blog-2025-08,www-blog-2025-09
bash $V/scripts/05-buy-cpc.sh
pnpm exec tsx --require ./scripts/lib/server-only-shim.cjs $V/scripts/06-persist-cpc.ts
pnpm exec tsx --require ./scripts/lib/server-only-shim.cjs $V/scripts/07-value.ts
python3 -I $V/scripts/08-tables.py
python3 -I outputs/sky-blog-proyeccion-2026-11/valor/scripts/09-keywords-report.py

# 4. Planilla, plan del informe y PDF
pnpm exec tsx outputs/sky-blog-proyeccion-2026-11/valor/scripts/10-planilla-keywords.ts <salida.xlsx>
pnpm exec tsx scripts/seo/sky-blog-projection-report.ts
pnpm report:compose outputs/sky-blog-proyeccion-2026-11/informe/sky-blog-proyeccion.plan.json --out .captures/sky-blog-proyeccion-report --asset org-logo:sky=ai-generations/2026-09-23_cmp003-sky-hangar/refs/sky-official.svg
```

**Notas de ejecución:**
- `run.sh` carga el client id OAuth de Search Console desde la revisión activa del `ops-worker`, sólo en el entorno del proceso, y apunta el secreto a su referencia en Secret Manager. No escribe nada a disco.
- La CLI canónica de valor corre un mes por vez. Repítela por cada mes del período.
- `05-buy-cpc.sh` gasta dinero. Con un trimestre nuevo, `04-cpc-plan.ts` debe recibir los sets del período nuevo, no los de 2026-08…10.
- `05-buy-cpc.sh` y `06-persist-cpc.ts` exigen autorización explícita del operador. Comprar y escribir en la base compartida son dos autorizaciones distintas.
- `06-persist-cpc.ts`: si queda sin salida, fuerza el proxy de `pnpm pg:connect` en el proceso (`GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME=` vacío, `GREENHOUSE_POSTGRES_HOST=127.0.0.1`, `GREENHOUSE_POSTGRES_PORT=15432`, `GREENHOUSE_POSTGRES_SSL=false`).
- Si SKY ya dio acceso a la cuenta de servicio, las consultas GA4 pueden ir por `pnpm ga4:query batch --property sky <specs.mjs> <dir>`. Ese comando acepta `kind: 'report' | 'funnel' | 'admin'`, así que `specs-00-discovery.mjs` (que usa `'get'`) hay que adaptarlo.

## 8. Trampas y lecciones (todas del 05-11-2026)

| Trampa | Lección |
| --- | --- |
| El split GA4 por país sobre rango largo cae a «(other)» (`dataLossFromOtherRow`); la auditoría del 23-10 lo subestimó (Chile ene-25: 73.640 contra 90.274) | Una consulta por mes (`specs-06`) |
| `vpv_bv` es evento clave y domina `keyEvents` (≈ 41 % de las sesiones) | Usar sólo `:purchase` |
| `purchase` sin monto: todas las métricas de ingreso en 0 | No hablar de ingresos; pedir el monto a Digital SKY |
| `landingPage` no trae host | Clasificar rutas con el umbral ≥ 95 % y declarar el conteo como conservador |
| Con filtro de página, GSC sólo da país para clics visibles; la primera serie salió mal (`raw/gsc-serie-mensual-v1-country-bug.csv`) | Declarar `country_basis`; total por país desde la propiedad sin filtro |
| GSC guarda 16 meses: enero–mayo de 2025 se perdió | Exportar la propiedad anterior apenas se confirme el acceso; para ene-2025 sólo quedan GA4 y Semrush |
| Se supuso que no había acceso a `www` | Confirmar con `sites.list`, no con lo dicho |
| El rango previo 28–45 mil se estimó sin `www` y quedó corto (real ≈ 43–61 mil) | Si se mantiene una cifra ya enviada, decirlo y marcar el sesgo (repago conservador) |
| Octubre extrapolado (27.560) contra cerrado (24.351) | Proyectar sólo desde meses cerrados |
| La base asumía arreglos en producción que no lo estaban | Verificar producción (descripción, JSON-LD, canonical, `robots.txt`, Azure) antes de fijar la trayectoria |
| Persistir 19.239 filas de CPC: ~10 min colgado por el Connector y ~50 min con el proxy | Forzar el proxy y presupuestar el tiempo |
| La 2ª consulta de clics de salida dio 2 a 4 veces las vistas con referrer y no se explicó | No presentar el clic de salida como compra ni sumarlo al referrer |

## 9. Checklist para la próxima vez

- [ ] Hay mes(es) cerrado(s) nuevo(s). Ventanas de specs y scripts actualizadas.
- [ ] Acceso GA4: `pnpm ga4:query doctor --property sky` o conexión OAuth de la organización activa. Controles de reconciliación cuadrados.
- [ ] País consultado mes a mes. Solo `purchase`. Embudo con `pageLocation`.
- [ ] `sites.list` revisado. Exportación de `www` vigente antes de que venza.
- [ ] `serie_ga4.json` actualizado e índices fijos de `proyeccion.py` movidos al nuevo `i = 0`.
- [ ] Estado real en producción de los arreglos técnicos y del proxy inverso, reflejado en las trayectorias.
- [ ] R observada contra hitos. Clics sin marca y posición revisados antes de leer enero como recuperación.
- [ ] CPC: leer el snapshot; comprar faltantes sólo con autorización y techo; persistir con una segunda autorización; volver a leer desde la base.
- [ ] Valor medido con cobertura, fecha del CPC y la aclaración «revaloración a precios actuales». El extrapolado rotulado «no canónico».
- [ ] Meses de la planilla y textos del informe (`slideId` `valor`, `keywords`, `limites`) ajustados al período nuevo.
- [ ] PDF y planilla abiertos y contrastados contra `resumen_modelo.json` y `valor-mensual-resumen.csv`.
- [ ] Archivos en OneDrive › Workspace › Clientes › Sky Airlines › Proyección Blog `<AAAA-MM>`, más la copia interna. Correo con firma gráfica y CCO, verificado en Enviados.
- [ ] `HECHOS.md` y `PROYECCION_<AAAA-MM>.md` actualizados sin reescribir las cifras anteriores.
