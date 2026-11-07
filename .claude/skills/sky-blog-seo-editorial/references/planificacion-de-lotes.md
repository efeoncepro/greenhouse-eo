# Planificación de lotes mensuales del Blog SKY

Sale de tres lotes reales: el lote inicial del 23-10-2026 (15 nuevos + 25 optimizaciones, con Semrush), el de
noviembre (54 artículos del Content Hub) y el de diciembre (25 reescrituras + 15 nuevos, planificado y cargado
el 06-11-2026). Diciembre es la plantilla. Los casos viven en `docs/services/sky-blog-seo/` y los scripts y datos de diciembre en `outputs/sky-blog-plan-diciembre-2026/`.

Este capítulo llega hasta que el lote queda cargado como «Idea» y con sus tareas creadas. El research, la redacción,
las specs y el handoff vienen después y siguen
[`lote-editorial.md`](lote-editorial.md),
con el manual `docs/manual-de-uso/growth/correr-lote-editorial-blog-sky.md`. Aquí no se repiten.

## 1. Casos de referencia

| Caso | Archivo | Qué aporta |
| --- | --- | --- |
| Lote inicial (23-10) | `docs/services/sky-blog-seo/caso-auditoria-2026-10/LOTE_INICIAL_PARA_APROBACION.md` | Reglas Nuevo/Optimizar, creación de `Trabajo SEO`, deduplicación contra lo que el equipo ya había cargado |
| Primer lote Perú (23-10) | `docs/services/sky-blog-seo/caso-auditoria-2026-10/PERU_PRIMER_LOTE.md` | Lectura de intención: el blog no compite por «vuelos a» |
| Noviembre (05-11) | `docs/services/sky-blog-seo/LOTE_NOVIEMBRE_2026_FLUJO_EDITORIAL.md` | Rechazos de SKY, rutas faltantes y `Trabajo SEO` mal cargado |
| Diciembre (06-11) | `docs/services/sky-blog-seo/LOTE_DICIEMBRE_2026_PLAN.md` | Plantilla completa, de los criterios a las tareas |

## 2. Cuándo se planifica y para qué lector

- **El lector de un mes planifica el siguiente.** Quien lee en diciembre organiza el verano austral (enero y
  febrero), el Carnaval (6 al 9 de febrero de 2027), la Candelaria y Semana Santa (21 al 28 de marzo de 2027).
- **Pico del blog:** enero es el mes más fuerte (208.099 visitas en enero de 2025 y 67.940 en enero de 2026).
  Lo de temporada tiene que estar publicado e indexado **antes** de que suban las búsquedas.
- **Cuándo:** diciembre se planificó y cargó el 06-11, unas tres semanas antes del 01-12. Las tareas tienen fecha
  límite cinco días hábiles antes de publicar, así que la primera vence el 24-11. Para planificar el mes M, cuenta hacia atrás desde esa
  primera fecha límite.
- **Ventana estacional del puntaje:** en diciembre se usaron los clics de nov–dic 2025 y ene–feb 2026, es decir,
  el mismo mes del año anterior y el período que el lector planifica. En enero, desplaza la ventana: el
  inventario trae `gsc_clics_mar-abr26`. Esto es una adaptación y todavía no se ha probado.
- Antes de elegir piezas, revisa cuáles del lote anterior ya tienen fecha en el mes. En diciembre ya había cinco
  de noviembre: Playas cerca de Buenos Aires (01-12), Brasil desde Chile (03-12), Punta Cana (07-12), Titicaca (10-12) y
  Candelaria (15-12).

## 3. Exclusiones (se aplican antes de puntuar)

| Exclusión | Cómo se aplicó en diciembre |
| --- | --- |
| URL y temas de meses anteriores | `build.py` lee los slugs de las specs de noviembre (`ai-generations/2026-11-05_sky-blog-lote/specs/*.json`) y las URL de O1–O25 del lote inicial, y agrega a mano dos de `NOTAS_LOTES` |
| Temas rechazados por SKY | Expresiones regulares en `build.py`: cambio de vuelo o pasaje, mascotas, bebé y Cancún/Riviera Maya |
| Temas cercanos a un rechazo | «Administra tu vuelo» y «vuelo cancelado» se sacaron a mano, por cercanía con cambio de vuelo. **Las expresiones regulares no los atrapan** |
| «Vuelos a» | El tipo `vuelos/pasajes a destino` queda fuera: esa búsqueda la ganan las páginas de rutas de skyairline.com, y el blog captura la intención informativa y la lleva a la ruta |
| Fuera de foco | Empleo, corporativo, noticias de rutas o promociones, demos, covid, grupos de marca |
| Sin operación | Destino sin ruta SKY o Cancún archivado (con `cobertura-rutas-vs-blog.csv`). En el lote de Perú, Huacachina quedó fuera porque SKY no vuela a Ica |

Para un lote nuevo, agrega a la lista de exclusiones **todo el lote anterior**: las URL canónicas, las URL
unidas con 301 y los temas de los nuevos. En diciembre se comprobó por script que ninguna de las 58 URL tocadas
estaba en noviembre ni en O1–O25 (`excl_hit` en `final.py`).

## 4. Selección de reescrituras

**Definición.** Una reescritura es una URL existente con historia en Google. Si varias URL compiten por la misma búsqueda,
se unen con 301 en la canónica y **cuentan como una sola pieza**. Si la URL está borrada o da 404, el trabajo
es «Restaurar y reescribir»: en el lote inicial fueron Ayacucho y Cusco.

**Fuentes** (todas leídas por `build.py`):

| Insumo | Ruta |
| --- | --- |
| Inventario de 1.697 posts con GSC y GA4 por período | `outputs/sky-blog-seo-audit-2026-10-23/SKY-clasificacion-1697-posts.csv` |
| Grupos de canibalización y canónica sugerida | `outputs/sky-blog-seo-audit-2026-10-23/canibalizacion-top40.csv` |
| Cobertura de rutas | `outputs/sky-blog-seo-audit-2026-10-23/cobertura-rutas-vs-blog.csv` |
| País del lector por página (2025 y 2026) y valor en Google Ads | `outputs/sky-blog-proyeccion-2026-11/valor/` (CSV históricos y `canonical/valor-*.json`) |

**Paso 1, el universo (`build.py`).** El script agrupa las URL en unidades (un grupo de canibalización equivale
a una canónica), anota cada exclusión con su motivo y escribe `candidatos-todos.csv`, con 1.519 unidades. Las que
no tienen exclusión reciben un `score` de cribado por percentiles: estacionalidad 30 %, pérdida 20 %, clics latentes 20 %,
GA4 10 %, valor 10 % y razón estacional 10 %. Suma +0,05 si es Perú, +0,03 si es un alrededor del aeropuerto y +0,03 si
une varias URL, y resta 0,05 si la operación es dudosa. Este `score` sirve para leer la lista; no es el puntaje
que se publica.

**Paso 2, la curaduría (`final.py`).** Con `candidatos-todos.csv` se arma a mano la lista `U` (canónica,
URL a unir, tema, destino, por qué en ese mes, fecha y nota) y la lista `S` de suplentes. `final.py` recalcula el
**puntaje documentado**:

```text
puntaje = clics nov–dic 2025 + clics ene–feb 2026
        + 0,5 × sesiones perdidas      (máx(0, sesiones/día pre − ahora) × 61)
        + 0,5 × clics latentes         (impresiones ago–sep × máx(0, 3 % − CTR))
        + 3 × valor en Google Ads (USD, ago–oct 2026)
```

La lista se ordena por puntaje y **ese orden da la numeración R1…R25**. Salidas:
`SKY-reescrituras-<mes>-<año>-top25.csv` y `-suplentes.csv`.

**Ajuste manual.** La lista `U` no sale sola del orden. Se ajustó para asegurar cupo de Perú doméstico, una
mezcla de temas (destinos, servicio y listados) y las prioridades de Natalia: Perú doméstico, alrededores del aeropuerto de
llegada y rutas internacionales. Diciembre terminó con 9 reescrituras que unen 33 URL. Los 301 los ejecuta
Efeonce con el administrador de WordPress **después** de la aprobación.

## 5. Selección de nuevos

**Definición.** Un nuevo es un tema sin URL en el blog y con demanda medida. En noviembre, ocho fichas «Nuevo» ya tenían URL
publicada (Catacaos, Iquitos, Lima en 3 días…). Por eso, antes de decidir que algo es nuevo, búscalo.

**Demanda con DataForSEO** (organización SKY `org-b9977f96-f7ef-4afb-bb26-7355d78c981f`; manual
`docs/manual-de-uso/growth/dataforseo-cli.md`). Primero, siempre `--dry-run`; después, `--max-usd` y `--yes`:

```bash
# Descubrimiento: hasta 10 semillas por mercado (PE y CL en diciembre). Se detiene en
# awaiting_finalist_approval antes de comprar SERP.
pnpm -s dataforseo -- research --keyword "<semilla1>,<semilla2>,…" --market PE \
  --discovery-limit 50 --org $ORG --dry-run
pnpm -s dataforseo -- research --keyword "<semillas>" --market PE --discovery-limit 50 --org $ORG \
  --max-usd <techo> --checkpoint <dir>/research-pe-checkpoint.json --yes --out <dir>/research-pe.json

# Volumen y serie de 12 meses de las candidatas (PE, CL y AR; dos pasadas por mercado)
pnpm -s dataforseo -- quick keyword-overview --keyword "<k1>,<k2>,…" --market CL --org $ORG --dry-run
pnpm -s dataforseo -- quick keyword-overview --keyword "<k1>,<k2>,…" --market CL --org $ORG \
  --max-usd 0.03 --yes --out <dir>/ko-cl.json
```

| Dato de diciembre | Valor |
| --- | --- |
| `research` PE / CL | 10 semillas cada uno, `discoveryLimit` 50, sin `--target`. Estimado USD 0,438; real USD 0,344 y USD 0,305; 367 y 211 keywords |
| `keyword_overview` | Seis corridas (`ko-*` y `ko2-*`, AR/CL/PE), techos de USD 0,02 a 0,03, cada una entre USD 0,014 y 0,022 |
| Total | **USD 0,76**, sin compra de SERP. Como referencia, el research de noviembre (57 SERP) costó USD 1,61 |
| Recibos | `outputs/sky-blog-plan-diciembre-2026/dataforseo-recibos/` (sin versionar) |
| Consolidado | `volumenes-keyword-overview.csv` (`mercado,keyword,volumen,mes_pico,serie_12m`). No hay un generador versionado de este CSV |

El techo total se acuerda con Julio antes de gastar. No uses Semrush para el volumen de un lote: se queda sin cuota.

**Validar que no esté duplicado.** `find.py` busca en las URL y los títulos del inventario, sin tildes; `+` une términos:

```bash
python3 outputs/sky-blog-plan-diciembre-2026/find.py "sillustani" "laguna+paca" "valle+mantaro"
```

Además, búscalo en las specs y los textos del lote anterior. Si un tema podría estar cubierto dentro de otro artículo,
déjalo como verificación «antes de redactar» en la ficha. Ejemplo: N11 Sillustani contra el texto de Titicaca.

**Verificar la ruta.** «Precios y Rutas SKY» (`collection://f5b6f169-6765-4981-834a-b018d8953ed3`): sólo cuentan las filas
🟢 Activa del **mercado del lector**. Si no hay fila, la pieza no entra; queda como suplente condicionada a que Paid la active.

**Ajustes y suplentes.** Lo que propone el análisis se revisa a mano. Diciembre sacó Pimentel (Lima–Chiclayo no está Activa) y el Valle
Sagrado (ya cubierto por «Cusco sin Machu Picchu» de noviembre), y metió N14 y N15. Los suplentes
se documentan con su motivo: por ejemplo, Punta Hermosa tiene 74.000 en PE, pero el lector es limeño; la Vendimia de Mendoza tiene demanda
chilena ambigua.

**Límite declarado:** los nuevos de diciembre no tienen validación SERP. La ficha lo dice («validar el SERP»).

## 6. País del lector, distribución, calendario y riesgos

**País del lector.** En las reescrituras es el mercado con más clics de consulta visible en Search Console (2025 + 2026,
columna `pais_lector`). En los nuevos es el mercado de la demanda medida. Si hay empate o la base es chica, lo decides tú y lo
declaras. Diciembre: R1 empata Chile/Perú y se contó en Chile; Costa Verde salía Chile 25 %·Perú 17 % con base chica
y se asignó a Perú; Semana Valdiviana salía Chile 50 %·EE.UU. 50 %.

**Distribución** (diciembre): por lector, Chile 22, Perú 16 y Argentina 2. Por destino, Chile 12, Perú 14, Brasil 4,
Argentina 2, Uruguay 1, más 7 guías de servicio o listados. Cuenta las dos vistas por separado y comprueba que cada una sume
el total del lote (40). Además, lista las piezas de cada prioridad de Natalia.

**Calendario.**

- Agrupa por semana; lo de playa y verano va primero, y los eventos de los meses siguientes al final, pero publicados antes
  del alza de búsquedas.
- Asigna fechas sólo en días hábiles, con dos o tres piezas por día como máximo.
- Evita los feriados de Chile y Perú y las vísperas. Diciembre evitó el 08-12, el 24-12, el 25-12 y el 31-12.
- Las fechas de eventos 2027 sin fuente oficial quedan como `[Pendiente antes de publicar]`.

**Riesgos y decisiones para SKY** (tabla Tema · Qué decidir · Dueño):

- Guías de servicio, a confirmar con Natalia (SKY rechazó cambio de vuelo, mascotas y bebé).
- Datos que sólo salen del Centro de Ayuda vigente.
- Fechas oficiales 2027.
- Los 301 que ejecuta Efeonce.
- Rutas de temporada: Puerto Natales y Punta Arenas.
- Rutas sin fila en el catálogo: Lima–Chiclayo y Santiago–Lima para Chile.

## 7. El documento del plan

Nombre: `docs/services/sky-blog-seo/LOTE_<MES>_<AAAA>_PLAN.md`; datos en `outputs/sky-blog-plan-<mes>-<aaaa>/`.
Copia la estructura de `LOTE_DICIEMBRE_2026_PLAN.md`:

| Sección | Contenido |
| --- | --- |
| Encabezado | Tipo, versión, creado (con el pedido literal), **estado**, enlace al lote anterior |
| Criterio | Para qué lector, definiciones de reescritura y nuevo, sin repetir el mes anterior, rechazos, ruta activa, país del lector, piezas ya agendadas |
| Reescrituras | `# · Título propuesto · URL canónica · se unen con 301 · Lector · Destino · ruta · ND / EF · Impr (CTR) · Por qué en <mes>` |
| Nuevos | `# · Título · Keyword principal (volumen, pico) · Secundarias · Lector · Destino · ruta`, más los ajustes sobre el análisis y la nota de no duplicado |
| Distribución | Por lector y por destino, empates y prioridades de Natalia |
| Calendario sugerido | Por semana |
| Riesgos y decisiones | Tema · Qué decidir · Dueño |
| Suplentes | Reescrituras y nuevos, con su motivo |
| Datos y método | Insumos y rutas, fórmula del puntaje, gasto DataForSEO, límites |
| Próximos pasos | Carga → aprobación de SKY → flujo del lote |
| Carga en el Content Hub | Readback y tabla de fechas tentativas |
| Proyecto y tareas | Proyecto, numeración, responsables, fechas límite, readback y excepciones |

## 8. Carga en el Content Hub

**Data source:** `collection://f1e39c2f-efe7-83f0-86db-0725e4f71611`. En Notion, el teamspace se llama «Sky Ariline - SEO+AEO», escrito así.

| Propiedad | Valor al cargar |
| --- | --- |
| `Artículo` | Título propuesto |
| `Estado` | Idea |
| `Trabajo SEO` | Nuevo · Optimizar URL existente · Restaurar y reescribir |
| `Temática` | Destinos · Planificación de viaje · Cultura · Noticias · Compromiso SKY |
| `Tipo` | `["Publicación de blog"]` |
| `Formato` | Artículo · Tutorial (diciembre: R15 fue Tutorial) |
| `Enlace` | URL canónica completa, sólo en reescrituras |
| `Responsable` | Valentina Hoyos |
| `Fecha de publicación` | Fecha tentativa, sin hora |
| `Aprobación cliente` | **Vacía** (En espera · Aprobado · Rechazado: la decide SKY) |

**Ficha en el cuerpo:**

1. `## Tema y enfoque` y un párrafo.
2. Viñetas con etiqueta en `<b>`:
   - **Tipo de trabajo**, con las URL que se unen con 301.
   - **Search Console del blog** (reescrituras) o **Búsqueda principal** y **Secundarias** (nuevos, con fuente y fecha).
   - **País del lector**.
   - **Conexión**: la ruta Activa, con la fecha de revisión del catálogo.
   - **Enlaces internos**.
   - **Planificación**.
   - **Antes de redactar**.
3. El pie: «Lote de <mes> … Idea de calendario; no constituye un artículo redactado. Pieza R1».

**Generador:** `outputs/sky-blog-plan-diciembre-2026/content-hub.py` (tuplas `R` y `N` → `content-hub-fichas.json`,
con `icon`, `properties` en formato `date:<propiedad>:start`/`is_datetime` y `content`). Para enero, cambia
las tuplas, `PLAN`, `FOOT`, la fecha de `CAT`, la aserción `len(pages) == 40` y `startswith('2026-12')`, y el ID de usuario del
responsable (ver §10).

**Antes de crear:** busca duplicados en el data source por `Enlace` (cada URL canónica y cada URL que se une) y por
título. Si el equipo ya cargó la idea, no la dupliques ni la modifiques: el lote inicial dejó así 12 de 40.
Anota la URL que deben reutilizar.

**Después de crear:** guarda `pieza,notion_page_id,fecha_tentativa` en `content-hub-ids.csv`, que es la entrada de las tareas, y
relee con SQL sobre el data source: el conteo por `Trabajo SEO`, el conteo por `Estado` y el mínimo y el máximo de `Fecha de
publicación`. Diciembre: 40 páginas, 25 «Optimizar URL existente» y 15 «Nuevo», todas en Idea, del 01-12 al 29-12.

## 9. Proyecto mensual y tareas en el teamspace SKY

Usa las bases del **teamspace SKY**, no las generales de la agencia, que no comparten relaciones con el Content Hub:

- Proyectos: `collection://74939c2f-efe7-8317-93fc-07d23a1dfba2`
- Tareas: `collection://a0039c2f-efe7-82ac-a67d-87513c3c50df`

**Proyecto:** «SKY · Producción Creativa - <Mes> <AA>» (diciembre: «… - Diciembre 26»), con ícono 🎨, `Estado` Planificación,
fechas del día 1 al último del mes, Prioridad Alta y Propietario Daniela.

**Tarea principal por artículo:**

| Campo | Valor |
| --- | --- |
| `Nombre de tarea` | «SKY · Artículo N: <título corto>», con ícono 📝 |
| `Estado` | Sin empezar |
| `Tipo de entregable` | `["Contenido"]` |
| `Proyecto` | El del mes |
| `Artículo Content Hub` | Su fila (URL `https://app.notion.com/p/<id sin guiones>`) |
| `Responsables` | Valentina + diseñador. Diciembre: Andrés del 49 al 68 y Melkin del 69 al 88 (primeras y últimas 20 por fecha) |
| `Fecha límite` | Días hábiles antes de la publicación. Diciembre: 5, sin contar el 08-12 ni el 25-12 |

- **Numeración:** consecutiva desde el último N, en orden de `Fecha de publicación`. Dentro del mismo día va el orden R1…R25 y
  luego N1…N15. Noviembre terminó en 48; diciembre fue del 49 al 88; enero empieza en 89. Antes de crear, confirma el último N en
  la base Tareas.
- **Cuerpo:** una mención a la fila del Content Hub y al Playbook. Las subtareas de diseño (IMG 1–3) **esperan al texto**
  (Fase 8). Lleva un callout gris ⚠️ con la fecha de creación, la pieza y la fecha tentativa. Las guías de servicio llevan
  además un callout amarillo ❓ para confirmar con Natalia.
- **Regla y excepción:** el Playbook pide crear la tarea sólo con `Aprobación cliente` = Aprobado. En diciembre se
  crearon antes por pedido explícito de Julio, y la excepción quedó escrita en el proyecto y en cada tarea. Sin ese
  pedido, crea las tareas a medida que SKY aprueba. Si SKY rechaza un artículo, su tarea pasa a Archivado y **el
  número no se reutiliza**.

**Generador:** `outputs/sky-blog-plan-diciembre-2026/tareas-sky.py`. Lee `content-hub-ids.csv` y escribe
`tareas-sky.json`. Para enero, cambia `PROJECT` (la URL del proyecto nuevo), el inicio `49 + i`, `HOLIDAYS`,
el corte `i < 20` de diseñadores, `SHORT`, `SERVICE` y la fecha del callout. Guarda los IDs en
`tareas-sky-ids.csv` (`articulo,pieza,tarea_notion_id,fecha_limite,responsables`).

**Readback:** desde el Content Hub, cada artículo del lote tiene **exactamente una** tarea en la relación `Tareas 1`.
Diciembre: 40 de 40.

## 10. Trampas medidas

| Trampa | Qué pasó | Regla |
| --- | --- | --- |
| Destino mal agrupado | El inventario agrupaba el Cañón de Shucto con Jauja, pero está en Amazonas. Se reemplazó por Laguna de Paca (R23) | Verifica la ubicación real antes de llamarlo «alrededor del aeropuerto» |
| Ruta inexistente | Pimentel dependía de Lima–Chiclayo, que no está Activa | Sin fila 🟢 del mercado del lector, la pieza no entra |
| Tema ya cubierto | El Valle Sagrado ya estaba dentro de «Cusco sin Machu Picchu» | Busca dentro de los textos del lote anterior, no sólo en sus títulos |
| CSV desactualizado | `final.py` todavía genera `/canon-de-shucto/`; la fila 23 del top 25 se corrigió a mano, sin métricas. El CSV de suplentes trae Chiclayo y no trae Pingüinos de Humboldt ni Bahía Inglesa, que sí están en el plan | Corrige el script y regenera; volver a correr `final.py` pisa la corrección manual. Manda el plan |
| Conteos de distribución | Lector y destino dan cifras distintas (Perú 16 contra 14) y los empates cambian los totales | Declara la regla de empate y comprueba las sumas |
| País del lector con base chica | Costa Verde, Semana Valdiviana y Torres del Paine tienen pocos clics de consulta visible | Decláralo en la ficha y en «Límites» |
| Cercanos a rechazados | Las expresiones regulares no atrapan «administra tu vuelo» ni «vuelo cancelado» | Revisa a mano la lista final contra los rechazos |
| «Nuevo» con URL | Ocho fichas de noviembre | Pasa `find.py` antes de etiquetar |
| Responsable mal nombrado | `content-hub.py` llamaba `JULIO` al ID de usuario `3c2d872b…`, que es Valentina Hoyos, y el plan decía «Julio como responsable». Corregido el 06-11: el responsable cargado es Valentina, como en noviembre | Resuelve los usuarios por nombre en Notion (`notion-get-users`) y relee `Responsable` después de cargar |
| `score` y puntaje | `candidatos-todos.csv` trae el `score` de cribado por percentiles; el puntaje del plan es el de `final.py` | Publica sólo el de `final.py` |
| Scripts temporales | Los de noviembre quedaron en el scratchpad | Versiona los generadores del mes en `outputs/sky-blog-plan-<mes>-<aaaa>/` |

## 11. Checklist del lote

1. [ ] Mes objetivo, lector y eventos del período siguiente, con sus fechas oficiales o marcados como pendientes.
2. [ ] Piezas del lote anterior ya agendadas en el mes.
3. [ ] Exclusiones actualizadas con **todo** el lote anterior, los rechazos de SKY y los temas cercanos.
4. [ ] `build.py` → `candidatos-todos.csv` con los motivos de exclusión.
5. [ ] Lista `U` curada (cupo de Perú doméstico, mezcla, prioridades de Natalia) y `final.py` → top y suplentes.
6. [ ] DataForSEO: preview, techo acordado, recibos guardados y gasto sumado.
7. [ ] Cada nuevo: `find.py`, specs y textos anteriores, y ruta 🟢 Activa del mercado del lector.
8. [ ] País del lector por pieza, distribución sumada en las dos vistas y empates declarados.
9. [ ] Calendario en días hábiles, sin feriados de Chile ni Perú.
10. [ ] Plan escrito con la estructura de §7 y los riesgos con su dueño.
11. [ ] Duplicados por `Enlace` y título, carga como Idea con `Aprobación cliente` vacía y readback SQL.
12. [ ] Proyecto del mes y tareas desde el último N, con `content-hub-ids.csv` como entrada.
13. [ ] Readback: una tarea por artículo en `Tareas 1`; excepción al Playbook escrita, si la hubo.
14. [ ] Generadores, CSV de IDs y plan versionados; después sigue el research de `lote-editorial.md`.

Medición: cada pieza se mide a 28 y a 56 días contra su propio punto de partida, con la foto T−28 congelada
(`docs/services/sky-blog-seo/README.md`).
