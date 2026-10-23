# Auditoría SEO consolidada del Blog SKY

Fecha: 23-10-2026. Alcance: `blog.skyairline.com` y su prefijo histórico `www.skyairline.com/blog/`.
Trabajo de solo lectura: no se cambió el CMS, las redirecciones, Azure, GTM ni ninguna conexión.
Gasto DataForSEO de esta pasada: 6 tareas SERP, unos USD 0,012. Semrush: lecturas por API.

Complementa y corrige la [auditoría del 15-10](2026-10-15-sky-organic-channel-audit.md). La
[matriz de cobertura](../../services/sky-blog-seo/COBERTURA_Y_PENDIENTES_AUDITORIA_2026-10-15.md)
sigue siendo el registro de frentes; esta pasada avanza los frentes 01 a 06 (ver §8).

## 1. Lo que pidió el cliente

Fuentes: reuniones en Notion del 27-07, 10-09, 28-09 (dos) y 15-10-2026, coherentes con HubSpot.

- **Pilar:** por qué el tráfico cayó de ~80k a ~40k tras la migración «obligatoria por seguridad», cuánto
  tarda recuperarlo (espera una recuperación importante en tres meses desde noviembre) y un indicador de
  cuánto costaría ese tráfico en Ads. Cree que «Google los penalizó».
- **Natalia:** contenido de rutas domésticas de Perú, refresh de internacionales, «qué hacer alrededor» del
  aeropuerto de llegada (ej. Arica), refresh de artículos que funcionaban, sin duplicar. Datos de
  operación desde el Centro de Ayuda de SKY. Aprobación previa de títulos + reseña.
- **Compromiso de Julio:** enviar la auditoría a Pilar antes del martes 20-10. Kickoff 02-11 10:00.

## 2. Respuesta corta

1. **No hay evidencia de una penalización.** Las URLs antiguas redirigen 1:1 con 301 (muestra de 110:
   93,6% mismo slug, 3,6% slug equivalente, 2,7% a 404; cero 302, cero a la home). Las acciones manuales y
   el informe de seguridad de GSC aún deben revisarse en la interfaz.
2. **La caída tiene tres etapas, no una:**

   | Etapa | Sesiones Organic Search GA4 | Qué pasó |
   | --- | --- | --- |
   | Antes de la migración (mar–sep 2025) | ene-25 208k → abr-25 94k → sep-25 75,5k (interanual −17% en mar, −48% en ago) | Coincide con la llegada de AI Overviews a las búsquedas en español (Semrush CL: 0 keywords con AIO en feb-25, 3.422 en mar-25, ~9.500 en jun-25) y con publicación masiva (511 posts con fecha 2025, parte republicados). |
   | Migración (26–27 sep 2025) | sep-25 75,5k → oct-25 42,6k | Es el «80k→40k» de Pilar. Se perdió la capa SEO (plugin AIOSEO), el blog pasó de subcarpeta de un dominio con 7.316 dominios de referencia a un subdominio con 262, y quedó una copia indexable en Azure. |
   | Después (2026) | ene-26 67,9k (pico de verano) → sep-26 29,0k → oct-26 (1–21) 18,7k | Quiebre de ranking hacia el 20-04-2026 (posición media 6 → 8) y nuevo escalón desde el 15-10-2026 en consultas de marca de equipaje. Interanual octubre: −36%. |

3. **Hoy el blog sigue cayendo**, no está estabilizado: −36% interanual en octubre y −8% contra septiembre.
4. **Perú es la mayor pérdida relativa en rankings, y no por falta de contenido.** Semrush PE: el blog
   tenía ~7.000 keywords y 387 en top 3 (ago-25); hoy 3.627 y 98. Hay 241 posts de Perú.
5. **Alerta del 23-10:** nueve posts de Perú que respondían 200 el 15-10 hoy dan 404 sin redirección
   (`como-llegar-a-ayacucho`, `catedral-de-tacna`, `mercado-central-de-tacna`, `viajes-cusco`,
   `volcan-chachani`, `viajar-a-peru`, `verano-en-peru`, `mejor-comida-peruana`, `musica-tipica-peruana`).
   En el mismo lapso aparecieron 12 posts nuevos. Alguien con acceso al WordPress está retirando y
   publicando. Si fueron a la papelera, WordPress los conserva 30 días.

## 3. Hallazgos técnicos (verificados el 23-10)

| # | Severidad | Hallazgo | Evidencia | Acción · owner |
| --- | --- | --- | --- | --- |
| T1 | Crítico | La migración eliminó la capa SEO: no hay plugin SEO, meta description, JSON-LD, autor ni fechas estructuradas. | Wayback 12-09-2025 de `/blog/equipaje-de-cabina/`: AIOSEO 4.7.9.1, meta description, BlogPosting, BreadcrumbList, Person, Organization. Hoy 15/15 artículos sin nada de eso. | Reinstalar un plugin SEO, recuperar las descripciones desde el archivo, schema BlogPosting + Breadcrumb + Organization (sameAs skyairline.com) y autores reales. WP + Efeonce. |
| T2 | Crítico | Copia pública e indexable del blog en el origen Azure. | `blog-sky-h0gfh8acecdrdtav.eastus2-01.azurewebsites.net` responde 200 a Googlebot, canonical a sí mismo, sin noindex, con su propio `wp-sitemap.xml`. No pasa por Cloudflare. | Restringir el App Service a IPs de Cloudflare o 301 a `blog.skyairline.com`; `X-Robots-Tag: noindex` mientras tanto. TI SKY. |
| T3 | Alto | Sin sitemap declarado ni enviado. | `blog.skyairline.com/robots.txt` = 404 (nginx); la lista de sitemaps de GSC está vacía (15-10). `www/robots.txt` devuelve HTML de la SPA. | robots.txt real con `Sitemap:`; enviar `wp-sitemap.xml` en GSC; sacar 14 `/layouts/`, `/hola-mundo/` y autores vacíos. TI + WP + Efeonce. |
| T4 | Alto | Solo el 37% de los posts es alcanzable por enlaces. | BFS de 130 páginas desde la home: 636 de 1.700 posts. Home sin H1 y con 9 enlaces; categorías con «cargar más» por AJAX sin `/page/N/`. | Paginación rastreable, hubs por país/destino, relacionados. WP + Efeonce. |
| T5 | Alto | Artículos con tráfico en 404 sin redirección. | `/como-cambiar-un-vuelo-en-sky-pasos-y-condiciones/` (3.433 sesiones antes de la migración; 4.748 clics GSC nov–dic 25) sin 301 a `/cambiar-vuelo-sky/`, que tiene su mismo H1. Más los 9 de Perú de §2.5. | Restaurar o 301 a equivalente. WP. |
| T6 | Medio | Canonical roto en la paginación. | `/page/2/` declara canonical `https://blog.skyairline.com/2/` (404). | Corregir con el plugin SEO. |
| T7 | Medio | Móvil lento (laboratorio; no hay datos de campo disponibles). | LCP móvil 5,7–20 s, 1,2–2,1 MB, ~153 requests, 0 `loading=lazy`, 0 WebP, preloader del tema `tripster`. | Quitar preloader, lazy/WebP, depurar plugins; pedir informe CWV de GSC. WP. |
| T8 | Medio | Enlaces internos con doble salto y UTM internas. | 3.052 referencias al prefijo antiguo (http → https → subdominio); UTM `optimonk`/`DESCARGAAPP_BLOG` en enlaces internos. | Reemplazo en base de datos. WP. |
| T9 | Medio | CTA roto o ausente. | 68 posts muestran el shortcode `[rock-convert-cta …]` como texto; 17% de los posts de destino no enlaza a SKY; ninguno tiene botón. SKY tiene `/flights/es/vuelos-a-{ciudad}` para cada destino. | CTA por plantilla al `vuelos-a-{ciudad}` del destino. WP + Efeonce. |
| T10 | Bajo-Medio | Superficie expuesta. | `/wp-json/wp/v2/users` lista 4 usuarios; `readme.html`, `xmlrpc.php` y namespaces `mcp`/`elementor-mcp-composer` públicos; 1.411 posts firmados por «administrador». | Bloquear enumeración y xmlrpc, auditar el endpoint MCP, autores reales. TI. |
| T11 | Contexto | El sitio principal no enlaza al blog en su HTML de servidor. | `www.skyairline.com` es una SPA (Vue/single-spa) con 0 `<a>` en el HTML inicial. | Enlace HTML desde menú/pie de www. TI SKY. |

Sin spam inyectado ni cloaking: Googlebot y navegador reciben los mismos bytes en 15/15 URLs.

## 4. Datos de búsqueda (GSC y GA4 al 21-10)

- **Desde enero, la pérdida es de impresiones y posición, no de CTR** (ene–feb → ago–sep: clics/día −58%,
  impresiones/día −65%, CTR 1,21% → 1,43%, posición 6,3 → 8,0). Por página: 39% de los clics perdidos por
  caída de posición, 54% por impresiones con posición estable, 4% por CTR, 3% por URL desaparecida.
- **Marca vs. sin marca** (clics/día ene–feb → ago–sep): marca 384 → 189 con CTR 17,0% → 7,3% e impresiones
  estables; sin marca 432 → 115 con impresiones −61% y posición 6,3 → 9,1.
- **Equipaje y políticas concentran la pérdida absoluta** (30 posts = 59% de los clics de ago–sep; −771
  clics/día). **Destinos y tips, la relativa** (−68% a −71%, por posición).
- **Escalón del 15-10-2026:** clics/día de ~900 a ~600, casi todo en equipaje. SERP en vivo del 23-10 (CL,
  escritorio): para «sky equipaje» el blog ya no aparece en el top 10 (primero un tercero con una nota de
  oct-2025); para «sky medidas de equipaje» el AI Overview cita `www.skyairline.com` y el blog aparece en 6
  con `/liquidos-en-avion/`, no con su guía de equipaje.
- **Canibalización:** 266 consultas con dos o más URLs relevantes; 41 grupos curados con 217 URLs (check-in,
  cambio de vuelo, equipaje, Torres del Paine, Machu Picchu, Punta Cana, Lima, Tacna, notas «-2»).
- **IA:** ~650 sesiones/mes desde ChatGPT y similares (~2% del orgánico). Discover y News irrelevantes.
- **Indexación no es el cuello de botella:** 1.662 páginas con ≥10 impresiones en septiembre.

## 5. Valor publicitario equivalente

| Método | Hoy | Antes de la migración |
| --- | --- | --- |
| Semrush «Organic Cost», CL + PE | ~USD 6.100/mes (sep-26: 5.239 + 850) | ~USD 28.500/mes (ago-25: 20.642 + 7.887) |
| GSC × CPC por país (método del indicador, extrapolando el CPC implícito ~USD 0,55 a todos los clics) | ~USD 16.000/mes | ~USD 40.000–45.000/mes |

Para el cliente se presenta como rango orientativo, con la cobertura medida (13,3% sin extrapolar) como
nota metodológica. El 71% del valor medido es de marca o soporte («sky equipaje»): se reporta aparte de la
adquisición por destinos.

## 6. Evaluación del trabajo del 15-10

**Bien hecho:** filtro GA4 deduplicado de ambos hosts, reconciliación GSC por alias, censo de 1.697 URLs,
prueba de 916 redirecciones, comparación con archivo histórico, detección del host Azure, de los CTA rotos
y de los 404, rechazo a redirigir a la home, costo DataForSEO registrado.

**Corregir antes de enviar a Pilar:**

1. No responde «por qué, cuánto y cuándo». Falta una portada ejecutiva y escenarios.
2. Usa 103k (jul–ago, pico de invierno) como referencia previa y descarta el «80k→40k» por falta de
   unidad, cuando GA4 lo confirma (sep-25 75,5k → oct-25 42,6k).
3. No nombra la causa «plugin SEO no migrado»; lo describe como «1.697 posts sin meta description».
4. Omite tres hipótesis: subdominio vs. subcarpeta, AI Overviews, y volumen masivo/duplicación.
5. Lee el crecimiento hasta enero como recuperación; es en buena parte estacional.
6. Deja de lado la propiedad GSC antigua. GSC conserva 16 meses: los datos de jul–sep 2025 de la
   propiedad `www` o de dominio se pierden entre noviembre de 2026 y enero de 2027. Hay que exportarlos ya.
7. El primer lote es editorialmente razonable pero tiene poca palanca: Trujillo (6 clics en ago–sep),
   Destinos de verano (29) y SKY Plus (página nueva, crecimiento) no son recuperación. Faltan las palancas
   de sitio completo y lo estacional (Año Nuevo, Navidad). La URL rota de cambio de vuelo se resuelve con
   un 301 inmediato. El metadato de cabina no incluye «equipaje de mano» ni «bolso».
8. El indicador de USD 2.116 con 13,3% de cobertura se leerá como «el blog vale USD 2k».
9. Lenguaje de auditoría interna (muestreo, T−28, PDF/UA, «no demuestra» repetido) en un entregable para
   una gerente de marketing.

## 7. Plan priorizado

**Esta semana (antes del kickoff):**

1. Detener y revertir el retiro de los 9 posts de Perú: preguntar a Natalia quién tiene acceso (la agencia
   anterior opera hasta octubre) y restaurar desde la papelera o el respaldo.
2. Exportar los datos de la propiedad GSC `www.skyairline.com` o de dominio (jul-2025 en adelante).
3. Revisar en GSC: acciones manuales, problemas de seguridad, informe de páginas e informe CWV.
4. Enviar el sitemap en GSC y pedir a TI un `robots.txt` real.

**Noviembre (sitio completo, mueve 1.700 URLs):**

5. Plugin SEO + metas + schema + autores (T1); canonical de paginación (T6).
6. Cerrar el origen Azure (T2).
7. 301 de los 404 con tráfico (T5) y reemplazo de enlaces internos antiguos (T8).
8. CTA por plantilla a `vuelos-a-{ciudad}` y eliminar shortcodes visibles (T9).
9. Paginación rastreable y hubs por país y destino (T4).
10. Refresh estacional antes del 15-11: Año Nuevo en Santiago, cenas de Navidad chilena y peruana.
11. Consolidar el clúster de equipaje y check-in (3 URLs por intención hoy) con datos del Centro de Ayuda.

**Diciembre–enero:**

12. Consolidar los 41 grupos canibalizados y podar contenido sin valor (COVID, notas duplicadas, eventos
    vencidos, destinos sin ruta y sin tráfico): ~170 redirecciones 301 y 150–250 noindex.
13. Perú: restaurar y consolidar Tacna, Ayacucho, Punta Sal, Máncora, Machu Picchu, Arequipa y Juliaca/Puno;
    nuevas solo donde hay brecha real (Chiclayo y alrededores, Cajamarca, Ayacucho).
14. «Alrededores del aeropuerto»: Arica–Putre–Chungará, Calama–San Pedro, La Serena–Elqui, Chiclayo–Sipán.
15. Rendimiento móvil (T7).

**Decisión estratégica para SKY (TI + marketing):** volver a servir el blog en `www.skyairline.com/blog/`
mediante un proxy inverso de Cloudflare (ambos hosts ya están detrás de Cloudflare), manteniendo el
WordPress aislado en Azure. Recupera la autoridad del dominio principal sin deshacer la separación por
seguridad. Requiere una migración inversa planificada (mapa de 301, sin cadenas) y es la palanca de mayor
alcance; también la de mayor riesgo y tiempo.

Backlog editorial de 30 piezas: [`SKY-backlog-editorial-nov-ene.csv`](../../../outputs/sky-blog-seo-audit-2026-10-23/SKY-backlog-editorial-nov-ene.csv).

## 8. Escenarios y medición

Medir contra el mismo mes del año anterior (nov-25 44,0k · dic-25 49,5k · ene-26 67,9k sesiones), nunca
contra septiembre. Enero sube por temporada aunque no se haga nada.

| Escenario | Supuesto | Nov-26 a ene-27 (sesiones orgánicas/mes, estimación) |
| --- | --- | --- |
| Sin intervención | Sigue la tendencia interanual de −35% | ~28k · 32k · 44k |
| Base | Correcciones de sitio completo en noviembre + refresh estacional y de equipaje | Igualar el año anterior hacia enero (~44k · 48k · 65k) |
| Estructural | Lo anterior + consolidación + vuelta a `/blog/` en el primer trimestre de 2027 | Acercarse a los niveles previos a la migración (~75k/mes) durante 2027 |

Son órdenes de magnitud para conversar expectativas, no compromisos. Las correcciones técnicas suelen
verse entre 4 y 8 semanas después de aplicadas; las consolidaciones, en 2–3 meses. Los niveles de 2024
(130–220k) no son un objetivo realista mientras AI Overviews responda las consultas genéricas de viaje.

## 9. Avance sobre la matriz de cobertura

- **SKY-AUD-01 Migración:** cronología en tres etapas; capa SEO perdida demostrada con archivo; sigue
  pendiente el registro de despliegue de TI.
- **SKY-AUD-02 Indexación:** host Azure, robots y sitemap verificados; indexación por páginas con
  impresiones. Pendiente revisar en la interfaz GSC acciones manuales y seguridad.
- **SKY-AUD-03 Editorial:** clasificación de 1.697 posts, 41 grupos canibalizados, cobertura de rutas.
- **SKY-AUD-04 SERP:** muestras en vivo y Semrush CL/PE; panel completo pendiente.
- **SKY-AUD-05 Enlaces:** subdominio 262 dominios de referencia frente a 7.316 del dominio raíz.
- **SKY-AUD-06 Móvil:** laboratorio por plantilla; sin datos de campo.
- **SKY-AUD-07 Contribución:** clics hacia skyairline.com 39,6k (ene-26) → 13,2k (sep-26), proporcionales
  al tráfico. Sin acceso a conversiones.

## Evidencia

- Entregables: `outputs/sky-blog-seo-audit-2026-10-23/` (clasificación de posts, backlog, canibalización,
  cobertura de rutas, cadenas de redirección, resumen técnico).
- Evidencia reproducible (no versionada): `.captures/sky-blog-seo-audit-2026-10-23/{tech,data,content,serp}`.
- Fuentes externas: [core update de marzo 2026](https://www.searchenginejournal.com/google-confirms-march-2026-core-update-is-complete/),
  [core update de mayo 2026](https://www.searchenginejournal.com/google-begins-rolling-out-may-2026-core-update/575589/),
  [AI Mode en Perú](https://kom.pe/ai-mode-de-google-ya-llego-al-peru-que-es-como-funciona-y-como-afecta-a-tu-negocio-en-2026/).
