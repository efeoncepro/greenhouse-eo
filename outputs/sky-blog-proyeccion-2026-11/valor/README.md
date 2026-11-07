# Blog SKY · Valor publicitario equivalente y series de Search Console (corte 05-11-2026)

Paquete de datos **sólo lectura** para la proyección de noviembre. Nada se escribió en Search Console, Notion, HubSpot,
Insights ni en el sitio. Sin commits. Escrituras externas: la compra DataForSEO de CPC (US$ 1,53, ver §8), que el
transporte registró en el ledger de gasto de Greenhouse, y su persistencia. **Actualización 05-11-2026: los CPC
quedaron persistidos** en `greenhouse_growth.seo_keyword_market_data` con el writer canónico (`scripts/06-persist-cpc.ts`,
autorizado explícitamente por Julio tras el bloqueo inicial del clasificador de permisos): 19.239 filas
`keyword_overview`, 4.987 con CPC, verificadas por lectura en la base. Los recibos de `dataforseo/` siguen como evidencia.

## 1. Definiciones

| Término | Qué es |
| --- | --- |
| **Valor medido** | Método canónico `gsc_clicks_country_cpc_v1` (`src/lib/growth/seo/organic-traffic-value/calculate.ts`): Σ clics GSC de página × consulta × país × CPC del mismo país (DataForSEO Labs `keyword_overview`, Google Ads; Chile 2152, Perú 2604, idioma es). Sin extrapolar. |
| **Cobertura de valoración** | Clics con consulta visible **y** CPC ÷ clics totales del control sin consulta. Los clics anonimizados por Google (≈ 60–70 %) y los de otros países nunca se valoran. |
| **Valor extrapolado (no canónico)** | CPC implícito de los clics valorados (valor medido ÷ clics valorados, ~US$ 0,53–0,56) × todos los clics. Es lo que el informe del 23-10 llamó «GSC × CPC extrapolado». El método canónico prohíbe publicarlo como el indicador; aquí sirve sólo para reconciliar el rango. |
| **Marca** | Regla canónica de SKY: `\bsky\b|skyairlines?` (sin distinguir mayúsculas). «sky plus», «sky equipaje» son marca. |
| **Semrush traffic cost** | Estimación de Semrush (ETV modelado × CPC), no clics observados. No se suma ni promedia con el valor GSC. |
| Propiedades | Blog: `https://blog.skyairline.com/` (conexión de la org). Antes de migrar: `https://www.skyairline.com/` filtrado a páginas `^https?://www.skyairline.com/blog(/|$)`. Ambas con `type=web`, `aggregationType=byPage`. |

Valor ≠ ahorro, ingreso ni ROI. Es lo que costaría comprar en Google Ads los clics orgánicos observados, a precios de
mercado estimados.

## 2. Acceso a la propiedad `www` (historia previa a la migración)

**Accesible y exportada.** El token de operador de la conexión de SKY ve `https://www.skyairline.com/` con permiso
`siteFullUser` (sites.list del 05-11-2026; confirma lo que SKY dijo ese día). Se leyó con la misma cuenta, sin cambiar la
propiedad conectada de la organización. GSC conserva 16 meses: **el primer día disponible es el 24-06-2025**; enero–mayo
2025 ya no existen en GSC. Exportado hoy (vence entre nov-2026 y ene-2027):

- `historia-www-blog-diaria-totales.csv`: diario, total/marca/sin marca (todos los clics), 24-06-2025 → 04-11-2026.
- `historia-www-blog-diaria-{total,brand,non_brand}-por-pais.csv`: diario × país; sólo clics con consulta visible (ver §3).
- `historia-www-blog-paginas-mensual.csv`: página × mes, jul/ago/sep 2025.
- `historia-www-blog-consultas-pagina-pais-mensual.csv`: página × consulta × país × mes (con y sin clics), jul/ago/sep 2025.
- `raw/gsc-inputs-www-blog-2025-{07,08,09,09-pre}.json`: entradas en la forma exacta del collector canónico (controles + detalle).

## 3. Serie mensual GSC (`gsc-serie-mensual.csv`)

Columnas: propiedad, mes, segmento (`total`, `brand`, `non_brand`, `anonymized_residual` = total − marca − sin marca),
país (`all`, `chl`, `per`, `other`), clics, impresiones, CTR, posición (ponderada por impresiones), días con dato, parcial.
`dataState=all`: nov-2026 (1–4) es provisional.

| Mes | Propiedad | Clics | Impresiones | CTR | Pos. | Marca | Sin marca | Anonim. | Chile | Perú | Otros |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| jul-25 | www/blog | 114.089 | 6.969.435 | 1,64 % | 12,9 | 20.067 | 28.077 | 65.945 | 42 %* | 28 %* | 30 %* |
| ago-25 | www/blog | 99.416 | 6.710.429 | 1,48 % | 12,8 | 17.763 | 22.996 | 58.657 | 44 %* | 25 %* | 30 %* |
| sep-25 | www/blog | 78.868 | 5.789.564 | 1,36 % | 9,9 | 13.023 | 18.182 | 47.663 | 47 %* | 24 %* | 30 %* |
| sep-25 (24–30) | blog | 2.714 | 137.755 | 1,97 % | 8,7 | 671 | 348 | 1.695 | 1.314 | 771 | 533 |
| oct-25 | blog | 44.828 | 2.320.259 | 1,93 % | 7,9 | 9.124 | 6.718 | 28.986 | 22.095 | 11.366 | 9.295 |
| nov-25 | blog | 45.155 | 2.805.859 | 1,61 % | 6,9 | 8.798 | 6.835 | 29.522 | 21.302 | 12.141 | 9.673 |
| dic-25 | blog | 49.741 | 3.704.859 | 1,34 % | 6,8 | 9.532 | 7.809 | 32.400 | 25.936 | 11.550 | 9.591 |
| ene-26 | blog | 76.201 | 6.344.466 | 1,20 % | 6,4 | 14.488 | 13.989 | 47.724 | 41.356 | 14.399 | 14.729 |
| feb-26 | blog | 62.678 | 5.423.769 | 1,16 % | 6,0 | 12.221 | 11.551 | 38.906 | 34.596 | 11.949 | 11.208 |
| mar-26 | blog | 47.266 | 4.458.615 | 1,06 % | 5,6 | 9.769 | 7.474 | 30.023 | 23.033 | 10.952 | 9.654 |
| abr-26 | blog | 36.454 | 3.390.996 | 1,08 % | 6,6 | 7.280 | 5.659 | 23.515 | 18.010 | 9.364 | 6.223 |
| may-26 | blog | 39.126 | 3.122.994 | 1,25 % | 8,3 | 7.053 | 6.690 | 25.383 | 19.967 | 9.729 | 6.681 |
| jun-26 | blog | 38.344 | 3.049.883 | 1,26 % | 7,8 | 7.071 | 6.794 | 24.479 | 21.018 | 8.840 | 6.004 |
| jul-26 | blog | 37.888 | 2.577.796 | 1,47 % | 7,8 | 8.158 | 5.108 | 24.622 | 17.783 | 11.787 | 5.497 |
| ago-26 | blog | 31.297 | 2.402.177 | 1,30 % | 8,0 | 6.849 | 3.947 | 20.501 | 15.827 | 8.460 | 4.740 |
| sep-26 | blog | 28.718 | 2.080.377 | 1,38 % | 7,8 | 6.118 | 3.183 | 19.417 | 14.924 | 7.564 | 4.143 |
| oct-26 | blog | 24.965 | 1.829.117 | 1,36 % | 7,8 | 4.532 | 2.901 | 17.532 | 13.675 | 6.465 | 3.243 |
| nov-26 (1–4) | blog | 2.547 | 211.769 | 1,20 % | 7,4 | 323 | 339 | 1.885 | 1.340 | 778 | 319 |

Clics, impresiones, CTR, posición, marca y sin marca: control agregado por página (`byPage`) con filtro de página.
**País:** Search Console, con filtro de página, sólo devuelve en la dimensión país los clics con consulta visible
(probado en `scripts/02b-country-probe.ts`: oct-26 da 7.433 de 24.965). Por eso, en el blog (la propiedad entera es el
blog) Chile/Perú/Otros salen de la agregación por propiedad sin filtro, que suma un 5–8 % menos que el control por página
(oct-26: 23.383). En www/blog (*) no existe ese total por país: se muestra el reparto de los clics con consulta visible.
La primera versión del CSV con el reparto incorrecto quedó en `raw/gsc-serie-mensual-v1-country-bug.csv`; la columna
`country_basis` del CSV vigente dice qué base usa cada fila.

Notas: www/blog jun-25 sólo 24–30 (22.952 clics). Después de la migración www/blog cae a ~0 (1.621 en oct-25, 1 en
oct-26): no hay doble conteo entre propiedades. Interanual: ago −69 % (99.416 → 31.297), sep −65 %
(81.582 entre ambas → 28.718), oct −44 % (44.828 → 24.965). El control de clics de sep-26 (28.718) coincide con el
piloto del 15-10.

## 4. Valor publicitario: hoy vs antes de migrar (`valor-mensual-resumen.csv`)

| Mes | Clics | Cobertura | Valor medido US$ | Marca | Sin marca | Chile / Perú | Extrapolado US$ (no canónico) |
| --- | ---: | ---: | ---: | ---: | ---: | --- | ---: |
| jul-25 (www/blog) | 114.089 | 14,3 % | 8.779 | 49 % | 4.487 | 6.465 / 2.314 | 61.378 |
| **ago-25 (www/blog)** | 99.416 | 14,3 % | **7.558** | 50 % | 3.801 | 5.623 / 1.935 | **52.993** |
| sep-25 (www/blog, mes completo) | 78.868 | 13,8 % | 5.881 | 51 % | 2.891 | 4.498 / 1.383 | 42.719 |
| sep-25 1–25 (pre-migración) | 73.590 | 13,8 % | 5.499 | 52 % | 2.627 | 4.185 / 1.314 | 39.823 |
| ago-26 (blog) | 31.297 | 14,9 % | 2.494 | 66 % | 846 | 1.971 / 523 | 16.780 |
| sep-26 (blog) | 28.718 | 13,4 % | 2.153 | 70 % | 645 | 1.707 / 446 | 16.093 |
| **oct-26 (blog)** | 24.965 | 12,0 % | **1.675** | 62 % | 630 | 1.395 / 280 | **13.945** |

- **Período reciente que el método soporta:** meses calendario ago, sep y oct 2026 completos (`dataState=final`).
  Promedio: **US$ 2.107/mes medido** (13,4 % de cobertura) · **≈ US$ 15.600/mes extrapolado**.
- **Comparación pre-migración:** jul–sep 2025 en la propiedad `www` (sólo `/blog/`). Promedio **US$ 7.406/mes medido** ·
  **≈ US$ 52.400/mes extrapolado** (ago-25: 7.558 / 52.993). Medido: −72 % (marca −62 %, sin marca −81 %: de
  ~US$ 3.700 a ~700/mes).
- Ambos lados usan CPC capturados el 15/17-10 y el 05-11-2026: aplicar el CPC de hoy a 2025 es una **revaloración a
  precios actuales**, no el precio de esa época.

### Reconciliación con las cifras publicadas (HECHOS.md, 23-10)

| Publicado | Hoy (este paquete) | Lectura |
| --- | --- | --- |
| Hoy US$ 6.000 (Semrush CL+PE) | sep-26 5.239 + 850 = **6.089** ✓; oct-26 3.749 + 1.119 = **4.868** | Se mantiene; el dato de oct-26 es nuevo y más bajo. |
| Hoy US$ 16.000 (GSC × CPC extrapolado) | sep-26 **16.093**; ago 16.780; oct 13.945 | Reproducido (CPC implícito 0,56). Oct baja a ~14 k. |
| Antes US$ 28.000 (Semrush ago-25) | 20.642 + 7.887 = **28.529** ✓ | Semrush ya venía bajando: ene-25 era 40.283. |
| Antes US$ 45.000 (GSC extrapolado, estimado sin acceso a `www`) | **ago-25 52.993**, jul-25 61.378, sep-25 42.719 (sep 1–25 ≈ 47.800 en base 30 días) | Con la propiedad real el techo pre-migración sube a **≈ US$ 43–61 k/mes** (media jul–sep 52 k). El 45 k quedaba corto. |
| 71 % del valor medido es marca | sep-26 **70 %** (2.116 → 2.153 al completar CPC); ago–oct 66 %; antes de migrar **49–52 %** | El peso de marca subió porque el valor sin marca se desplomó. |
| Cobertura sin extrapolar 13,3 % | sep-26 **13,4 %** (13,32 % sin los CPC nuevos); ago–oct 12,0–14,9 % | Igual. |

El valor medido de sep-26 sube de US$ 2.116,38 a 2.152,94 porque 751 consultas de Chile y 390 de Perú del piloto del 15-10
no tenían fila de mercado (se compraron ahora; la mayoría sin CPC del proveedor).

## 5. Desglose de keywords (lo que pidió SKY)

Archivos por período (`blog-ago-oct-2026`, `blog-oct-2026`, `www-blog-jul-sep-2025`, `www-blog-ago-2025`):

- `desglose-keywords-<período>.csv`: una fila por **consulta × país**, con clics del período y por mes, CPC US$, fuente del
  CPC, fecha de captura y de actualización del proveedor, valor US$, marca/sin marca, tema, landing con más clics y n.º de
  páginas. Incluye las filas sin CPC (valor vacío) para que la cobertura sea visible.
- `top50-keywords-<período>.csv`: las 50 de mayor valor.
- `temas-<período>.csv`: valor, valor/mes, participación, clics visibles y valorados, y valor de marca por tema.

Top 15 ago–oct 2026 (3 meses): sky equipaje CL 253 · sky equipaje de mano CL 250 · equipaje sky CL 249 · sky maletas CL
220 · sky mascotas CL 211 · sky tripulante de cabina CL 182 · bolso de mano sky PE 134 · sky mascotas en cabina PE 99 ·
sky equipaje PE 98 · sky plus CL 89 · equipaje de mano sky CL 84 · maletas sky CL 67 · equipaje de mano sky medidas CL 64 ·
equipaje sky PE 62 · sky empresas CL 62 (US$ del período). Las 15 son de marca.

Temas (participación del valor medido):

| Tema | ago–oct 2026 (US$/mes) | jul–sep 2025 (US$/mes) |
| --- | --- | --- |
| Equipaje | 39,7 % (836) | 26,7 % (1.978) |
| Check-in | 0,4 % (9) | 1,0 % (76) |
| Mascotas | 6,2 % (132) | 2,6 % (196) |
| Cambios | 4,5 % (94) | 7,2 % (534) |
| Destinos Chile | 14,0 % (294) | 21,6 % (1.596) |
| Destinos Perú | 2,5 % (53) | 8,6 % (634) |
| Internacionales | 9,2 % (194) | 15,6 % (1.154) |
| Otros · SKY Plus, empresas y servicios | 6,9 % (145) | 2,2 % (165) |
| Otros · empleo y tripulación | 8,6 % (181) | 4,8 % (354) |
| Otros · resto | 8,1 % (170) | 9,7 % (721) |

La clasificación por tema es por reglas de texto sobre la consulta (y el slug de la landing para destinos), en
`scripts/08-tables.py`; es orientativa y revisable.

**Cobertura**: ago–oct 2026, 34–30 % de los clics tiene consulta visible y 12–15 % tiene consulta + CPC. El 66–70 %
restante son clics anonimizados por Google (no se valoran) y el resto, consultas visibles sin CPC del proveedor o de
países fuera de Chile/Perú.

## 6. Semrush (`semrush-historia-mensual.csv`, `semrush-historia-combinada-cl-pe.csv`)

`resource_rank_history`, 4 llamadas (≈2.400 unidades API): `www.skyairline.com/blog/` y `blog.skyairline.com`, bases CL
y PE, jul-2023 → oct-2026, palabras clave, top 3, tráfico y traffic cost. Combinado CL+PE, ambos hosts:

- Subida 2023–2024: US$ 10 k (jul-23) → 32–35 k (may–oct 2024).
- **Nivel «prime»: US$ 30–40 k/mes entre may-2024 y may-2025** (máximo ene-25: 40.283; 243 mil visitas estimadas).
- Ya en descenso antes de migrar: ago-25 28.529, sep-25 25.448 (el tráfico estimado se mantenía en ~190–214 mil).
- Migración: oct-25 12.406 → nov-25 4.391; repunte estacional ene-26 15.220; desde entonces 7–8,5 k, **sep-26 6.089,
  oct-26 4.868**.

## 7. Comandos y scripts (en `scripts/`)

Todos desde la raíz del repo, bash. `run.sh` toma el client id OAuth público de Search Console de la revisión activa del
`ops-worker` sólo en el entorno del proceso (no lo escribe a disco) y apunta el secreto a su referencia en Secret Manager.

```bash
V=outputs/sky-blog-proyeccion-2026-11/valor
bash $V/scripts/run.sh $V/scripts/01-probe-sites.ts            # sites.list del token (propiedades visibles)
bash $V/scripts/run.sh $V/scripts/02-monthly-series.ts         # gsc-serie-mensual.csv + raw/gsc-daily-*.json
bash $V/scripts/run.sh $V/scripts/02b-country-probe.ts         # prueba de la base del reparto por país
# Método canónico, propiedad del blog (CLI oficial), un mes por corrida:
bash $V/scripts/run.sh scripts/seo/organic-traffic-value.ts --org=org-b9977f96-f7ef-4afb-bb26-7355d78c981f \
  --site=https://blog.skyairline.com/ --host=blog.skyairline.com --from=2026-10-01 --to=2026-10-31 \
  --save-input=$V/raw/gsc-inputs-blog-2026-10.json --out=$V/canonical/valor-blog-2026-10-pre-compra.json
bash $V/scripts/run.sh $V/scripts/03-www-collect.ts            # www /blog/: espejo del collector canónico + CSV de historia
pnpm exec tsx --require ./scripts/lib/server-only-shim.cjs $V/scripts/04-cpc-plan.ts \
  blog-2026-08,blog-2026-09,blog-2026-10,www-blog-2025-07,www-blog-2025-08,www-blog-2025-09   # plan + payloads, sin gasto
bash $V/scripts/05-buy-cpc.sh                                  # pnpm dataforseo run … --dry-run y luego --yes con techo
pnpm exec tsx --require ./scripts/lib/server-only-shim.cjs $V/scripts/06-persist-cpc.ts   # HECHO 05-11 (ver nota abajo)
pnpm exec tsx --require ./scripts/lib/server-only-shim.cjs $V/scripts/07-value.ts         # cálculo canónico con snapshots + recibos
python3 -I $V/scripts/08-tables.py                             # CSV de entrega
```

`03-www-collect.ts` replica `collectOrganicTrafficValueInputs` porque el collector canónico sólo lee la propiedad
conectada (el blog). `07-value.ts` usa `calculateOrganicTrafficValue` sin cambios. Al persistir (06), la CLI canónica con
`--input=$V/raw/gsc-inputs-<set>.json` debe reproducir `canonical/valor-<set>.json`; los `*-pre-compra.json` son la
corrida de la CLI antes de comprar.

`06-persist-cpc.ts` (05-11): la primera corrida quedó ~10 min sin salida porque `loadGreenhouseToolEnv` iba por el
Cloud SQL Connector. Con el proxy levantado por `pnpm pg:connect`, se forzó el proxy local en el proceso:
`GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME= GREENHOUSE_POSTGRES_HOST=127.0.0.1 GREENHOUSE_POSTGRES_PORT=15432
GREENHOUSE_POSTGRES_SSL=false`. ~700 filas por lote, ~50 min para las 19.239.

## 8. Gasto

- **DataForSEO:** 29 tareas `keyword_overview/live` (19 Chile, 10 Perú), 19.239 keywords sin fila previa, estimado
  US$ 2,66, **real US$ 1,52508** (techo del encargo US$ 3; corte automático si se pasaba). Recibos, previews y log en
  `dataforseo/` (`plan.json`, `*-receipt.json`, `buy-run.log`). Organización SKY, consumer `seo`.
- **Semrush:** 4 llamadas por MCP dentro del plan (≈2.400 unidades).
- GSC: lecturas dentro de cuota, sin costo.

## 9. Brechas y advertencias

- Valor ≠ ahorro, ingreso ni ROI; no hay causalidad atribuible a Efeonce. El rango publicable sigue siendo
  «medido (piso) – extrapolado (techo)», con la cobertura al lado.
- CPC de hoy aplicado a 2025 = revaloración. El CPC por país viene de Google Ads vía DataForSEO; muchas consultas largas
  no tienen CPC (el proveedor responde sin dato).
- Ene–may 2025 ya no existe en GSC (16 meses). Para enero 2025 sólo queda GA4 (208.099 sesiones, HECHOS) y Semrush.
- La propiedad `www` filtrada a `/blog/` y la del blog no son idénticas en CTR/posición (mezcla de impresiones distinta);
  comparar clics y valor, no posición media entre propiedades.
- `dataState=all` en la serie mensual (nov provisional); el valor usa `final`.
- Hecho el 05-11: los CPC (06) quedaron en `seo_keyword_market_data` (19.239 filas, 4.987 con CPC, verificadas por
  lectura); Insights y la CLI los reutilizan sin volver a comprar.
- `dataforseo/` pesa ~300 MB (recibos completos) y `raw/` ~26 MB: no versionar.
