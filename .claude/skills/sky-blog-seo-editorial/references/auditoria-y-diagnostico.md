# Auditoría y diagnóstico del Blog SKY

Método que salió de dos pasadas sobre `blog.skyairline.com`: la auditoría del 15-10-2026 (`docs/audits/growth/2026-10-15-sky-organic-channel-audit.md`) y la consolidada del 23-10-2026 (`docs/audits/growth/2026-10-23-sky-blog-seo-audit-consolidada.md`), cuyo §6 corrige a la primera. Más tarde se le sumaron los ajustes del kickoff (02-11) y de la proyección (05-11).
El expediente vive en `docs/services/sky-blog-seo/caso-auditoria-2026-10/`. Las cifras salen sólo de `docs/services/sky-blog-seo/caso-auditoria-2026-10/HECHOS.md`.

## 1. Qué responde la auditoría

Antes de abrir datos, lee las reuniones con el cliente y anota lo que pidió con sus palabras. En SKY las fuentes fueron las «Reuniones» de Notion del 27-07, 10-09, 28-09 (dos) y 15-10-2026, cruzadas con las reuniones de HubSpot de la empresa (`30825221458`). Después traduce cada pregunta a una pregunta medible:

| Pregunta del cliente | Pregunta medible | Con qué se responde |
| --- | --- | --- |
| «¿Por qué cayó de ~80k a ~40k tras la migración?» | ¿Cuántas sesiones Organic Search tenía el blog (los dos hosts, sin duplicar) el mes anterior y el mes posterior a la migración? ¿Y cómo venía la serie antes? | Serie mensual GA4 y caída por etapas (§3.4) |
| «¿Google nos penalizó?» | ¿Hay acción manual o problema de seguridad en GSC? ¿Las URL antiguas redirigen 1:1 con 301? ¿Hay spam inyectado o cloaking? | Muestra de redirecciones, revisión en la interfaz de GSC, comparación Googlebot vs navegador (§3.3, §3.8) |
| «¿Cuánto tarda en recuperarse?» | ¿Qué nivel se puede esperar mes a mes contra el mismo mes del año anterior, en tres escenarios? | Escenarios con su supuesto, presentados como estimación y no como compromiso (§3.10) |
| «¿Cuánto costaría ese tráfico en Ads?» | ¿Cuánto vale hoy y antes de migrar el tráfico orgánico, con CPC por país, separando marca y cobertura? | Valor publicitario equivalente como rango (§3.9) |
| Pedidos editoriales (Natalia: Perú doméstico, refresh internacional, alrededores del aeropuerto, refresh de lo que funcionaba, sin duplicar) | ¿Qué rutas operadas no tienen cobertura? ¿Qué artículos compiten entre sí? ¿Qué perdió más clics? | Clasificación, canibalización y cobertura de rutas (§3.2, §3.6, §3.7) |

Anota también los compromisos de Efeonce tal como se dijeron. Julio comprometió la auditoría «antes del martes» 20-10 y el indicador; no comprometió plazo ni cifra de recuperación. El informe no debe prometer más que eso.

## 2. Fuentes y accesos

Un acceso nombra un recurso concreto. Antes de cada extracción confirma cuál tienes y regístralo con fecha.

| Fuente | Identidad usada | Qué acredita | Qué no acredita |
| --- | --- | --- | --- |
| GA4 | Propiedad `354430952` (`SKY web GA4 - Prod`), calendario America/Santiago, mediante la conexión GA4 de la organización `org-b9977f96-f7ef-4afb-bb26-7355d78c981f` | Sesiones Organic Search con landing en el alcance; filtro OR entre el host actual y el prefijo anterior ejecutado dentro de Google, así que no hay duplicados | Ventas o ingresos (el `purchase` de SKY no trae monto). Las sesiones por página no se suman. `pnpm ga4:query` con la cuenta de servicio de Efeonce daba 403 al 05-11 porque SKY todavía no la agrega como Lector |
| Search Console, propiedad del blog | `https://blog.skyairline.com/`, búsqueda web, datos finales, calendario Pacífico | Clics, impresiones, CTR y posición desde que existe el subdominio (primeros clics el 26-09-2025) | La historia anterior a la migración, que vive en otra propiedad |
| Search Console, propiedad `www` | `https://www.skyairline.com/`, filtrada a `/blog/` | Historia del blog cuando era una subcarpeta. Se exportó el 05-11, con el primer día conservado el 24-06-2025 | Nada anterior a 16 meses: ene–may 2025 ya se había perdido |
| WordPress público | REST `wp-json/wp/v2/posts`, `wp-sitemap.xml`, HTML | Inventario, plantilla, enlaces, usuarios expuestos | Permiso para cambiar el CMS. Un censo HTML tampoco equivale a una revisión editorial |
| WordPress administrador | Entregado por SKY el 27-10 a Julio, Valentina y `mkt@` | Configuración efectiva y papelera | Las claves llegaron en texto plano por correo: hay que cambiarlas al primer ingreso y nunca van al repo, al deck ni a Notion. Las credenciales del WordPress de Efeonce no sirven para SKY |
| Wayback Machine | Capturas del prefijo `/blog/` (por ejemplo, 12-09-2025) | Cómo estaba la plantilla antes (AIOSEO 4.7.9.1, schema), la lista de URL antiguas para la muestra y las etiquetas GTM anteriores | La fecha exacta del despliegue, que sólo da el registro de TI |
| Semrush (API, dentro del plan) | `/blog/` y subdominio, Chile y Perú | Serie histórica estimada de keywords, top 3, traffic cost, keywords con AI Overview y dominios de referencia | Tráfico real. Son estimaciones y van rotuladas así |
| DataForSEO | `pnpm dataforseo` con preview, organización, consumer SEO y techo de gasto | SERP en vivo, CPC por país, visibilidad con método ETV explícito | El histórico exacto de una carpeta: no compres el dominio padre para simular `/blog/` |
| Notion | Reuniones, Content Hub, «Precios y Rutas SKY» | Expectativas, estado editorial, rutas enlazables | Cifras de desempeño |
| API pública de rutas de SKY | Rutas por origen y aeropuertos (23-10) | Destinos operados, por ejemplo los 17 de Perú | La disponibilidad comercial futura |

Regla: la lectura analítica no da permiso de escritura. En toda la auditoría no se tocan el CMS, las redirecciones, Azure, GTM ni las conexiones.

## 3. Pasos, en orden

### 3.1 Abrir el corte y la carpeta de evidencia

1. Fija una fecha de corte por fuente (en el caso: GA4 y GSC al 21-10, sitio, SERP y Semrush al 23-10) y escríbela en la cabecera de `HECHOS.md`.
2. Guarda las extracciones crudas, los scripts y los recibos fuera de git, en `.captures/<auditoría>/{tech,data,content,serp}` (en el caso: `.captures/sky-blog-seo-audit-2026-10-23/`). Lo que se entrega va a `outputs/<auditoría>/`.
3. Lee GA4 y GSC por la conexión de la organización. En el caso se usó el script `.captures/sky-blog-seo-audit-2026-10-23/data/fetch.ts`, que es sólo de lectura y se corre con `pnpm exec tsx --require ./scripts/lib/server-only-shim.cjs <este> <dirSalida>`. No está versionado. Los scripts Python de `content/scripts/` escriben en una ruta de scratchpad de esa sesión: corrige la ruta antes de reutilizarlos.

### 3.2 Inventario y clasificación

1. Censo completo desde la API REST pública, paginando de a 100 (`tech/scripts/rest.py`) y cruzado con `wp-sitemap.xml`. En el caso: 1.697 posts en el censo; el sitemap del 23-10 listaba 1.700.
2. Separa lo que no es contenido editorial: demo (`/hola-mundo/`), 14 `/layouts/`, cuerpos y títulos idénticos, familias de slug `-N` (61 familias, 135 posts al 23-10). El total del censo no equivale a piezas únicas.
3. Clasifica cada post por tipo, país, ciudad y aeropuerto con un gazetteer (`content/scripts/gaz.py`, `classify.py`, `stage2.py`). Marca para revisión manual lo ambiguo, como los requisitos de viaje que se verifican en fuente oficial.
4. Agrega a cada fila sus métricas por ventana (GA4 pre/post migración, GSC por bimestre), la razón ahora/antes, el grupo de canibalización, la acción sugerida y el **estado en vivo al corte**. Resultado: `outputs/sky-blog-seo-audit-2026-10-23/SKY-clasificacion-1697-posts.csv`.
5. La fecha que muestra el CMS puede ser una republicación. Antes de llamar «nueva» a una pieza, busca si tiene filas antiguas en GSC (Piura y Huacachina las tenían).

### 3.3 Reconstruir la migración

1. **Fecha observada:** el día en que el tráfico pasa del prefijo al subdominio en GA4/GSC (26–27/09/2025) y la última captura de archivo que todavía servía el prefijo. Esto no reemplaza el registro de despliegue de TI, que se pide.
2. **Redirecciones con muestra:** toma URL antiguas desde Wayback (110 artículos con captura hasta el 25-09-2025) y pide cada una con UA de Googlebot, sin seguir redirecciones automáticamente (`tech/scripts/chains.py`). Registra saltos, códigos, destino final, canonical, H1, meta refresh o JS y si el destino está en el sitemap. Prueba también las variantes http, apex, sin barra final, mayúsculas, locales y feed. Clasifica cada caso como `same_slug_200`, `other_url_200` o `final_404`. Resultado: `redirect-chains-2026-10-23.csv`. Lo que tumba la tesis de penalización: cero 302/307 y cero redirecciones a la home.
3. **Enlaces heredados:** cuenta las referencias internas al prefijo antiguo y sigue cada destino distinto (15-10: 916 solicitudes; ver `outputs/sky-organic-audit-2026-10-15/SKY-redirecciones-antiguas-auditadas.csv`). Une los 404 de distintos censos sin sumar conjuntos a ciegas.
4. **Capa SEO perdida:** compara la captura de archivo de un artículo (`/blog/equipaje-de-cabina/`, 12-09-2025) con la plantilla actual en 15 URL (`tech/scripts/template.py`). Mira meta description, JSON-LD, autor, fechas estructuradas, hreflang, lazy y WebP. Inventaría los plugins visibles en el HTML. En el caso aparecieron AIOSEO 4.7.9.1 antes y ningún plugin SEO hoy, y se le dio nombre a la causa: «plugin SEO no migrado». Contar «1.697 posts sin meta description» describe el síntoma, no la causa.
5. **Copias del origen:** busca el host de origen (en el caso, el App Service de Azure). Comprueba si responde 200, si tiene canonical propio, noindex o sitemap propio, y si queda fuera del CDN.
6. **Medición:** compara las etiquetas GA4/GTM del HTML archivado con las actuales. Un cambio visible de configuración no prueba que GA4 estuviera apagado.

### 3.4 La caída por etapas

1. Arma la serie mensual GA4 Organic Search desde dos años antes, siempre con meses completos. Un mes en curso se marca como parcial y nunca se compara con meses completos.
2. Calcula el **cambio interanual de cada mes**, nunca contra septiembre ni contra el pico de enero: el blog es estacional (enero es verano en Chile).
3. Corta la serie en etapas con fecha y explicación: previa (mar–sep 2025), migración (26–27/09/2025) y posterior (2026, con quiebre de posición hacia el 20-04-2026 y escalón desde el 15-10-2026). Busca los quiebres en los datos diarios de GSC y confírmalos con SERP en vivo.
4. Descompón la pérdida de clics por página en tres efectos: caída de posición, impresiones con posición estable y CTR. Agrega las URL desaparecidas. Sepáralas también por tipo de contenido y por marca y sin marca. El regex de marca del caso, en `fetch.ts`, fue `(?i)(sky ?airline|skyairline|\bsky\b|sky ?plus|skyplus)`.
5. Normaliza por día cuando las ventanas tienen distinta duración y reconcilia cada cruce contra su control sin dimensión. Con filtro de página, la dimensión país sólo devuelve clics de consultas visibles: indica la base en cada fila. Si no hay fila, no hay registro visible, que no es lo mismo que demanda cero.
6. Agrupa los alias exactos de host y path (con y sin barra) sumando clics e impresiones y ponderando la posición por impresiones. Un diccionario que pisa alias habría perdido 3.350 clics de septiembre (15-10).

### 3.5 Hipótesis de contexto

Ponles nombre y evidencia, pero déjalas como hipótesis:

- Subdominio vs. subcarpeta: dominios de referencia del subdominio frente a los del dominio raíz (Semrush).
- AI Overviews: keywords con AIO por mes (Semrush CL), comparadas con el inicio de la caída previa.
- Volumen y duplicación: posts con fecha del año y familias `-N`.
- Core updates: fechas con fuente externa, citadas en la consolidada.

### 3.6 Canibalización

1. Lista las consultas GSC con dos o más URL relevantes (en el caso: 266).
2. Cura los grupos a mano por intención (`content/scripts/groups.py`). Para cada grupo, propone la canónica por criterio editorial y la canónica según los datos, más la acción. Resultado: `canibalizacion-top40.csv` (41 grupos, 217 artículos).
3. Un 301 sólo se propone con equivalencia semántica (mismo H1 o misma intención). Un slug parecido o un HTTP 200 no bastan.

### 3.7 Cobertura de rutas contra el blog

Cruza los aeropuertos y las rutas de SKY por país (`content/raw/routes-CL.json`, `routes-PE.json`, `airports.json`) con los artículos clasificados (`content/scripts/routes.py`). Por destino registra si la ruta es SKY o interlínea, cuántos artículos hay (total y de destino), cuántos son de «qué hacer», la última publicación y los clics antes y ahora. Resultado: `cobertura-rutas-vs-blog.csv`. Los enlaces y banners de ruta sólo salen de las filas 🟢 de «Precios y Rutas SKY» del mercado del lector.

### 3.8 Indexación, rastreo, seguridad y móvil

1. **En la interfaz de GSC:** acciones manuales, problemas de seguridad, informe de páginas y CWV, con captura fechada. Al 23-10 seguía pendiente: sin esa captura no se afirma que «no hay acción manual», sólo que «no hay evidencia de penalización».
2. **Spam y cloaking:** compara los bytes que reciben Googlebot y un navegador en una muestra (15/15 idénticos) y revisa los títulos REST y los enlaces ocultos.
3. **Rastreo:** `robots.txt` de cada host, sitemaps enviados en GSC y BFS desde la home con UA de Googlebot (`tech/scripts/bfs.py`, 130 páginas). Así se mide qué porcentaje de posts es alcanzable por enlaces y a qué profundidad. Revisa los canonicals de paginación.
4. **Superficie:** `/wp-json/wp/v2/users`, `xmlrpc.php`, `readme.html` y namespaces REST públicos.
5. **Móvil:** si PSI no responde (429 sin key), usa laboratorio con Playwright (`tech/scripts/lab.mjs`, 4x CPU, 1,6 Mbps) por plantilla y rotúlalo «laboratorio, sin datos de campo».
6. **Indexación:** las páginas con impresiones en el mes muestran si la indexación es o no el cuello de botella.

### 3.9 Valor publicitario equivalente

Sigue `docs/services/sky-blog-seo/INDICADOR_VALOR_ORGANICO_V1.md` y el cálculo de `src/lib/growth/seo/organic-traffic-value/` (clics GSC por página, consulta y país × CPC del mismo país). Preséntalo como **rango** entre dos métodos (Semrush Organic Cost y GSC × CPC extrapolado), con marca y sin marca por separado y la cobertura medida como nota de método. Un CPC de hoy aplicado a 2025 es una revaloración a precios actuales. No lo llames ahorro ni ROI.

### 3.10 Escenarios

Arma tres escenarios (sin intervenir, base y estructural), cada uno con su supuesto, contra el **mismo mes del año anterior**. «Sin intervenir» usa la caída interanual medida del último mes cerrado, no una constante (ajuste del 05-11). Los plazos de efecto que se informan: correcciones técnicas entre 4 y 8 semanas, consolidaciones entre 2 y 3 meses. Antes de intervenir, congela T−28..T−1 y observa en T+28 y T+56.

### 3.11 Comparar el inventario entre cortes

En cada pasada, cruza el inventario contra el corte anterior y lista lo que pasó de 200 a 404 o redirige, y lo que es nuevo. El 23-10 aparecieron nueve posts de Perú que estaban vivos el 15-10 y respondían 404, más 12 posts nuevos: alguien con acceso al WordPress retira y publica. Avisa con la lista de URL y recuerda que la papelera de WordPress conserva los posts 30 días.

## 4. Hallazgo, hipótesis y pendiente

- **Hallazgo verificado:** tiene fecha, fuente, universo o muestra y evidencia reproducible. Ejemplo: «0 de 1.700 artículos con meta description; antes, AIOSEO 4.7.9.1 (Wayback 12-09-2025)».
- **Hipótesis:** es plausible y tiene indicios, pero no prueba causa. Se nombra y se dice qué la confirmaría (subdominio, AI Overviews, volumen).
- **Pendiente:** falta evidencia o acceso. Tiene dueño y condición de cierre, y no se convierte en «aprobado» ni en hallazgo.

Cada hallazgo técnico va en una tabla como esta:

| # | Severidad | Hallazgo | Evidencia | Acción · owner |
| --- | --- | --- | --- | --- |
| T1 | Crítico | La migración eliminó la capa SEO | Captura de archivo vs. 15/15 URL de hoy | Reinstalar el plugin SEO, metas, schema y autores · WP + Efeonce |

Los pendientes llevan dueño y condición de cierre (ver la tabla «Pendientes» de `docs/services/sky-blog-seo/caso-auditoria-2026-10/README.md`). Los frentes de la auditoría integral se siguen en `docs/services/sky-blog-seo/COBERTURA_Y_PENDIENTES_AUDITORIA_2026-10-15.md`, con columnas separadas para investigación, preparación, aplicación y resultados. Un check se marca sólo con la evidencia de cierre exigida. Tener un plan o un archivo preparado no cierra un frente.

**`HECHOS.md` es la fuente única de cifras.** Informe, correos, deck, skills y docs citan desde ahí. Cuando llegan cifras nuevas, se agrega una sección fechada («Hechos del 05-11») sin reescribir las anteriores: lo enviado se conserva como enviado.

## 5. Entregables y cómo regenerarlos

| Entregable | Dónde | Cómo se produce |
| --- | --- | --- |
| Auditoría interna | `docs/audits/growth/<fecha>-sky-blog-seo-audit-consolidada.md` | Redacción con §«Evaluación del trabajo anterior» cuando hay una pasada previa |
| Tablas de apoyo | `outputs/sky-blog-seo-audit-2026-10-23/` (clasificación, canibalización, cobertura de rutas, redirecciones, backlog de 30 piezas, `findings-summary-2026-10-23.md`) | Scripts de `.captures/.../{tech,content}/scripts/` |
| Informe A4 para el cliente | `outputs/sky-blog-seo-audit-2026-10-23/informe/` (plan JSON + PDF de 23 páginas) | Ver comandos abajo; cargar `report-studio` |
| Correos | `docs/services/sky-blog-seo/caso-auditoria-2026-10/correos/` | Borradores en el repo; se envían por Outlook web según `docs/operations/EFEONCE_OUTLOOK_AGENT_SEND_POLICY_V1.md` (firma gráfica, CCO de HubSpot, «Adjuntar como una copia») |
| Deck del kickoff | Fuente HTML en `ai-generations/2026-10-31_kickoff-seo-sky/canvas/project/` (el orden vive en `canvas.json`); PDF en `ai-generations/2026-10-31_kickoff-seo-sky/deck/out/` (fuera de git) | Claude Design (artifact privado). Las fuentes no documentan un comando de regeneración. Sin plantilla SKY, va con la línea Efeonce y `deck-studio` |

Informe A4. El generador toma las cifras de la auditoría consolidada y calcula folios e índice a partir del orden de las páginas:

```bash
pnpm exec tsx scripts/seo/sky-blog-audit-report.ts [salida.json]
pnpm report:compose <plan.json> --out <dir> --asset org-logo:sky=ai-generations/2026-09-23_cmp003-sky-hangar/refs/sky-official.svg
```

Sin argumento, el plan se escribe en `outputs/sky-blog-seo-audit-2026-10-23/informe/sky-blog-audit.plan.json`. Para otra auditoría, copia el generador y cambia las series y los textos. No edites el JSON a mano.

- **Logo:** usa siempre el SVG oficial negativo de SKY (`ai-generations/2026-09-23_cmp003-sky-hangar/refs/sky-official.svg`) sobre la portada navy. El logo adjunto a la organización en Greenhouse está **generado por IA**: tiene manifiesto C2PA y la «K» mal dibujada.
- **Revisión:** revisa el PDF página por página y abre cada PNG después de recomponer. En la proyección, un CSV regenerado renombró una columna y la página imprimió `NaN` (05-11). `report-table` admite 4 columnas y 16 filas.
- **Lenguaje:** es para una gerencia de marketing. Nada de «muestreo», «T−28», «PDF/UA» ni «no demuestra» repetido.

OneDrive:

- **Interna:** `OneDrive › Alineación › 1. Clientes (Interno) › Sky - SEO-AEO › Auditoría SEO 2026-10`. De aquí sale el adjunto del 23-10.
- **Canal compartido con SKY:** «Sky - Efeonce - General». No dejes borradores ahí. El PDF se copia a «04 Entregables» sólo después del envío.
- **Adjuntos que Julio envía (regla desde el 05-11):** se preparan en `OneDrive › Workspace › Clientes › Sky Airlines › <carpeta del entregable>`. La copia de Alineación queda como expediente interno. Las carpetas con el nombre del cliente en la raíz son canales compartidos.

## 6. Trampas medidas

| Fecha | Trampa | Qué se hace ahora |
| --- | --- | --- |
| 15-10 | Tomar la fecha del CMS como fecha de creación | Buscar filas GSC antiguas antes de llamar «nueva» a una pieza |
| 15-10 | Un diccionario de alias GSC que pisa entradas | Agrupar los alias sumando; habría perdido 3.350 clics |
| 15-10 | Proponer un 301 por slug parecido o por HTTP 200 | Exigir equivalencia semántica; nunca redirigir a la home |
| 23-10 | Aceptar la tesis de «penalización» | Muestra de redirecciones con código y destino, más acciones manuales y seguridad en GSC. La capa SEO perdida explicaba más que Google |
| 23-10 | Tomar jul–ago (pico de invierno) como referencia previa y leer la subida hasta enero como recuperación | Interanual mes a mes y la cifra del cliente contrastada en GA4 (sep-25 → oct-25) |
| 23-10 | Describir el síntoma sin nombrar la causa | «Plugin SEO no migrado», demostrado con el archivo |
| 23-10 | Dejar de lado la propiedad GSC antigua | GSC conserva 16 meses: exportar ya. Al 05-11, ene–may 2025 ya se había perdido |
| 23-10 | Una cifra única de valor (USD 2.116 con 13,3 % de cobertura) se lee como «el blog vale 2k» | Rango y cobertura como nota de método |
| 23-10 | Un primer lote con poca palanca (Trujillo, 6 clics) | Primero las palancas de todo el sitio y lo estacional, después las piezas |
| 23-10 | Terceros despublican en el WordPress | Comparar el inventario entre cortes en cada pasada |
| 23-10 | Usar el logo de la organización en Greenhouse | SVG oficial; el de la organización es IA |
| 23-10 | Dejar el PDF en el canal compartido antes de enviarlo | Carpeta interna hasta el envío |
| 23-10 | Dar por medido el móvil con PSI agotado | Rotular como laboratorio, sin campo |
| 27-10 | El cliente lee la meta como «volver a enero de 2025» | Lámina «Qué significa recuperar»: meta contra el mismo mes del año anterior |
| 27/28-10 | Claves de WordPress en texto plano por correo | Cambiarlas al primer ingreso; nunca registrarlas |
| 31-10 | El PDF enviado comparaba enero con septiembre («dos tercios») | Corregirlo de palabra en el kickoff y en el deck. El generador ya dice «−48 % en agosto de 2025 contra el año anterior» |
| 31-10 → 01-11 → 05-11 | Se registró acceso a `www` por error; se corrigió como sólo blog; después `sites.list` mostró que el token sí ve `www` | Comprobar con `sites.list`, no con lo que se dijo |
| 05-11 | Con filtro de página, el país sólo trae consultas visibles | Repartir por país sin filtro y declarar la base |
| 05-11 | `vpv_bv` infla la tasa de conversión | Usar sólo `purchase`, como coincidencia en el mes y como piso |
| 05-11 | El SERP de DataForSEO llega envuelto (`google.com/goto`) | Recalcular la posición desde `breadcrumb`/`website_name` |

## 7. Checklist para repetir la auditoría

- [ ] Leer reuniones (Notion y HubSpot) y escribir las preguntas del cliente y los compromisos tal como se dijeron.
- [ ] Traducir cada pregunta a una pregunta medible con su fuente (§1).
- [ ] Confirmar accesos con fecha: propiedad GA4, propiedades GSC por `sites.list`, WordPress (y cambio de claves) y GTM/infra.
- [ ] Exportar ya la propiedad GSC antigua filtrada al prefijo, antes de que venzan los 16 meses.
- [ ] Fijar el corte por fuente, abrir `.captures/<auditoría>/` y `outputs/<auditoría>/`, y crear o ampliar `HECHOS.md`.
- [ ] Censo REST + sitemap; separar demo, layouts, duplicados y `-N`; clasificar con estado en vivo.
- [ ] Comparar el inventario contra el corte anterior y alertar con la lista de URL retiradas.
- [ ] Muestra de URL antiguas desde Wayback: código, saltos, destino, H1 y variantes.
- [ ] Plantilla antes y ahora con captura de archivo; inventario de plugins; host de origen y copias.
- [ ] Serie mensual GA4 (los dos hosts, sin duplicar) con interanual mes a mes y etapas con fecha.
- [ ] Descomponer la pérdida: posición, impresiones y CTR; marca y sin marca; por tipo; reconciliar con los controles.
- [ ] Hipótesis de contexto con evidencia y rótulo de hipótesis.
- [ ] Canibalización curada por intención; cobertura de rutas contra destinos operados.
- [ ] En la interfaz de GSC: acciones manuales, seguridad, páginas y CWV, con captura fechada.
- [ ] Rastreo (robots, sitemaps, BFS, canonicals), superficie expuesta, spam y cloaking, móvil.
- [ ] Valor publicitario como rango, con marca aparte y cobertura; escenarios contra el mismo mes del año anterior.
- [ ] Tabla de hallazgos con evidencia y owner; hipótesis y pendientes separados; matriz de cobertura actualizada sin marcar checks sin evidencia.
- [ ] Informe A4 regenerado con el generador y el logo oficial; revisión de cada página y cada PNG.
- [ ] Borradores de correo en `correos/`; adjunto desde la carpeta interna; al canal compartido sólo después del envío.
- [ ] Registrar costo de datos (DataForSEO con recibo, llamadas a Semrush) y confirmar que no se cambió nada en el sitio.
