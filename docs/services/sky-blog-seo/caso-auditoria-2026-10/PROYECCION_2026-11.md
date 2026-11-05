# Caso SKY · Proyección a 24 meses y aporte a la venta (pedido del kickoff)

Fecha: 05-11-2026. Estado: **informe (13 páginas), planilla y correo preparados; nada enviado a SKY.**

## El pedido

- **Kickoff del 02-11** (nota y transcripción en Notion «Reuniones» › «Kick-Off - Sky / SEO»):
  - Pilar pidió «un aprox proyectado de cuándo podríamos estar volviendo al prime que teníamos en cuanto a tráfico y
    en cuanto al repago».
  - Pidió también el análisis de cómo el blog impacta en la conversión.
  - Al cierre, Julio se comprometió a enviarlo esa semana, junto con el desglose de las búsquedas valorizadas frente
    a Google Ads.
- **Teams, chat «Sky - Efeonce / SEO - Shared», 05-11 18:01:** Pilar recordó «lo pendiente de la reu del lunes». Julio
  respondió que lo estaban terminando.

## Qué se entrega

| Pieza | Dónde |
| --- | --- |
| Informe A4 | `outputs/sky-blog-proyeccion-2026-11/informe/` (plan) y PDF compuesto con `pnpm report:compose`; para adjuntar en OneDrive › Workspace › Clientes › Sky Airlines › Proyección Blog 2026-11; copia interna en 1. Clientes (Interno) › Sky - SEO-AEO › Proyección 2026-11 |
| Planilla de búsquedas valorizadas | Mismas carpetas de OneDrive; generador `valor/scripts/10-planilla-keywords.ts` |
| Generador del informe | [`scripts/seo/sky-blog-projection-report.ts`](../../../../scripts/seo/sky-blog-projection-report.ts) |
| Modelo de proyección | `outputs/sky-blog-proyeccion-2026-11/modelo/proyeccion.py`; salidas `proyeccion_mensual.csv` y `resumen_modelo.json` |
| Series GA4 y conversión | `outputs/sky-blog-proyeccion-2026-11/ga4/`: orgánico por mes, país y canal; compra en la sesión, embudo lector → compra, navegación por referrer y clics a skyairline.com |
| Valor publicitario y desglose de búsquedas | `outputs/sky-blog-proyeccion-2026-11/valor/`: serie GSC mensual (blog y `www`), valor por tema y búsqueda, historia `www` exportada, Semrush |
| Correo para Pilar | [correos/03-proyeccion-y-conversion.md](correos/03-proyeccion-y-conversion.md) |

**Comandos para regenerar:**

```bash
python3 -I outputs/sky-blog-proyeccion-2026-11/modelo/proyeccion.py
python3 -I outputs/sky-blog-proyeccion-2026-11/valor/scripts/09-keywords-report.py
pnpm exec tsx scripts/seo/sky-blog-projection-report.ts
pnpm report:compose outputs/sky-blog-proyeccion-2026-11/informe/sky-blog-proyeccion.plan.json --out .captures/sky-blog-proyeccion-report --asset org-logo:sky=ai-generations/2026-09-23_cmp003-sky-hangar/refs/sky-official.svg
```

## Método

### Tasa de recuperación R

Es la visita orgánica del mes dividida por la del mismo mes de 2025, antes de migrar.

- En 2026, R estuvo entre 0,31 y 0,38 todos los meses; el promedio fue 0,348.
- Octubre a diciembre de 2025 ya eran meses posteriores a la migración, así que su referencia se estima: octubre de
  2026 ÷ 0,348, y noviembre y diciembre con el mismo paso estacional de 2025.
- R = 1 es el «mejor nivel» alcanzable: el blog de 2025 con respuestas de IA y antes de migrar. Equivale a unas
  208.000 visitas en enero y unas 95.000 en un mes de invierno. 2024 (168.000 de promedio mensual) queda como
  referencia histórica, no como meta.

### Escenarios

Cada escenario es una trayectoria de R, con sus supuestos en el código.

| Escenario | Supuesto | Tasa R |
| --- | --- | --- |
| Sin intervenir | La caída interanual de octubre de 2026 (−43 %, mes cerrado) durante 2027 y −20 % en 2028 | — |
| Base | Arreglos técnicos más lote editorial; el blog sigue en el subdominio | 0,31 en enero de 2027 (≈ el año anterior), 0,42 en octubre de 2027 y 0,50 en octubre de 2028, el techo supuesto del subdominio |
| Estructural | La base más proxy inverso a skyairline.com/blog desde marzo de 2027 | Converge en 8 meses a una banda de 0,75 a 0,95 y después sube 5 puntos |

### Valor y repago

- **Valor:** visitas × US$ 0,293–0,470 por visita, el valor de agosto de 2025 (US$ 28.000–45.000 con 95.710
  visitas). El rango por visita de hoy (US$ 0,21–0,55) tiene el mismo punto medio.
- **Repago:** valor ÷ honorario. El honorario es CLP 3.000.000 netos al mes, unos US$ 3.058 a 980,9 CLP por dólar
  (05-11-2026).

## Lo que se verificó el 05-11

- La configuración SEO todavía no está en producción: los artículos no tienen descripción ni JSON-LD y conservan
  el canonical. `robots.txt` sigue en 404 y la copia en Azure sigue respondiendo 200.
- Por eso la base de noviembre y diciembre queda en la tasa actual. Los ~65.000 de enero dependen de que esos
  arreglos estén en producción antes del 20-11; si se corren a diciembre, enero queda en ~55.000.
- Esto corrige el escenario base del informe del 23-10, que daba 44.000 en noviembre y 48.000 en diciembre.

## Lo que se midió el 05-11

**Tráfico (GA4).** Octubre de 2026 cerrado: 24.351 visitas orgánicas, −43 % contra octubre de 2025. Reemplaza la
extrapolación de 27.560 desde el 1–21. Los hitos no cambian, porque la referencia de octubre se deriva del mismo
mes; sí cambia «sin intervenir» (enero de 2027: 38.850 en vez de 44.161). Del 1 al 4 de noviembre: 2.546, −56 %.

**Conversión (GA4).** Los eventos clave son `purchase` y `vpv_bv`; el segundo infla la tasa genérica, así que se
usa sólo `purchase`.

- Personas que vieron el blog y compraron ese mismo mes: unas 2.350 al mes en ene–sep 2025 y unas 1.000 en
  ene–oct 2026 (774 en octubre). Su tasa de compra fue de 2,1 a 2,7 % en 2026 y de 1,4 a 2,4 % antes de migrar.
- Sesiones que entran por el blog y compran en la misma sesión: 0,25 % contra 2,7 % del sitio en octubre de 2026.
- **El evento `purchase` no trae monto:** `purchaseRevenue` y los demás ingresos están en 0 en toda la propiedad.
  No se pueden medir ingresos por blog.
- Pasar del blog a skyairline.com no abre otra sesión: los dominios cruzados no son un problema.

Es coincidencia en el mes, no atribución, y es un piso: no cubre cambio de dispositivo ni cookies rechazadas.

**Valor publicitario (GSC × CPC).**

- Valor medido al mes: US$ 2.107 hoy contra US$ 7.406 en jul–sep 2025 (−72 %); sin marca, −81 %.
- La historia de `www` se exportó el 05-11: GSC conserva desde el 24-06-2025, y enero–mayo de 2025 ya se perdió.
- Con datos reales, el valor previo extrapolado da unos US$ 43.000–61.000 al mes. El informe mantiene
  US$ 28.000–45.000, la cifra enviada el 23-10, así que el repago de antes está, si algo, subestimado.
- Los CPC comprados (US$ 1,53, 29 tareas DataForSEO) quedaron guardados el 05-11 con el writer canónico (`valor/scripts/06-persist-cpc.ts`, autorizado por Julio): 19.239 filas `keyword_overview` en `greenhouse_growth.seo_keyword_market_data`, 4.987 con CPC, verificadas por lectura en la base.

## Lectura interna (no va a SKY)

El pico de enero puede ser estacionalidad y no recuperación. En 2025 y en 2026 la caída de enero a septiembre fue
la misma (−53 % del bimestre enero–febrero al bimestre agosto–septiembre).

- Si la caída de 2026 fue sobre todo estacional, enero de 2027 sin intervenir podría rondar 60.000 y no 44.000.
  En ese caso, llegar a 65.000 no probaría la recuperación.
- Por eso el informe mide R contra el mismo mes de 2025 y pide además la lectura de abril a septiembre de 2027.
- **Antes de celebrar enero**, mirar en Search Console los clics de búsquedas generales y su posición.

## Pendientes

| Pendiente | Dueño | Condición |
| --- | --- | --- |
| Agregar la cuenta de servicio `greenhouse-gtm-publisher@efeonce-group.iam.gserviceaccount.com` como Lector en GA4 de SKY | Pilar / Digital SKY | Pedido en el correo; habilita `pnpm ga4:query` sin OAuth ni Vercel ([manual](../../../manual-de-uso/growth/consultar-ga4-por-cli.md)) |
| Monto en el evento `purchase` de GA4 | Digital SKY | Sin él no hay ingresos por blog |
| Fecha del proxy inverso con TI | Pilar / TI de SKY | Reunión de 15 minutos pedida en el kickoff |
| Configuración SEO, robots.txt y cierre de Azure en producción | Efeonce / TI de SKY | Antes del 20-11 para sostener enero |
| Revisar y enviar el correo con el PDF y la planilla | Julio | Copia en Enviados con adjuntos y CCO |
