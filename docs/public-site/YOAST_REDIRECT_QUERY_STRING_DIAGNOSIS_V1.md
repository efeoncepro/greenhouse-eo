# Redirects de Yoast con parámetros: diagnóstico y propuesta

> **Tipo de documento:** Diagnóstico técnico + propuesta de plataforma (sitio público)
> **Versión:** 1.0
> **Creado:** 2026-10-17 por Claude (sesión con Julio Reyes)
> **Estado:** **Propuesta lista para aprobar. Nada desplegado.** Producción sólo se tocó en lectura.
> **Origen:** hallazgo del [retiro de `/agencia-diseno-estrategico/`](LEGACY_AGENCIA_DISENO_ESTRATEGICO_RETIREMENT_PLAN_V1.md) §7
> **Rail:** [`taxonomy-permalink-migrations.md`](../../.claude/skills/efeonce-public-site-wordpress/references/taxonomy-permalink-migrations.md) · skill `efeonce-public-site-wordpress`

## 1. Resumen

En `efeoncepro.com`, cuando la URL trae parámetros (`?utm_source=`, `?fbclid=`, `?utm_source=chatgpt.com`), un
redirect *plain* de Yoast SEO Premium **no se activa**, y una URL que debía redirigir termina en **404**. La causa
está en el código de Yoast, no en la configuración del sitio.

El impacto **medido hoy es casi nulo**: no hubo visitas reales con parámetros a esas URLs en la ventana de logs
disponible. El riesgo es hacia adelante:
- cada URL que se retire (ya hay retiros planeados en PDR-013 y PDR-022) queda expuesta;
- los asistentes de IA agregan `utm_source` a las URLs que citan;
- los enlaces de campañas, newsletters y redes sociales suelen llevar UTM.

**Propuesta:** un mu-plugin pequeño y versionado que lee los mismos redirects de Yoast y responde cuando la URL
trae parámetros, **conservándolos** en el destino. Además, aplanar las 8 cadenas de redirects que existen hoy.

## 2. Causa raíz (verificada en el código)

Versiones instaladas: Yoast SEO **28.6** y Yoast SEO Premium **27.7**. Archivo:
`wordpress-seo-premium/src/initializers/redirect-handler.php`. El flujo es así:

1. `get_request_uri()` toma `$_SERVER['REQUEST_URI']` **completo, incluida la query**, y sólo le quita el
   subdirectorio.
2. `handle_normal_redirects()` normaliza quitando barras (`trim($url, '/')`) y busca con `search()`, que es
   `$this->redirects[$url]`: **igualdad exacta de clave**.
3. `find_url_fallback()` sólo reintenta con y sin barra final; **nunca prueba sin la query**.
4. No hay filtros (`apply_filters`) en ese camino, así que no se puede corregir con un hook de Yoast.

Resultado: `habla-con-un-experto?utm_source=x` no es una clave de la lista, Yoast no hace nada y WordPress
responde 404. Los **posts** con slug viejo se salvan por otra vía: la redirección nativa de WordPress (old slug)
los redirige y conserva la query. Las **páginas** y los **archivos de categoría** no tienen esa red.

No verifiqué si una versión más nueva de Yoast Premium cambia este comportamiento. Premium va una versión
detrás de Free (27.7 frente a 28.6), lo que conviene revisar por higiene, pero sin evidencia no hay que asumir
que actualizar lo corrige.

## 3. Alcance medido (2026-10-17)

**Inventario Yoast:** 115 redirects *plain* (58 de tipo 301 y 57 de tipo 410) y 0 regex.

**Prueba en vivo de los 58 redirects 301**, primero sin parámetros y después con `?utm_source=audit`:

| Resultado con parámetro | Cantidad | Detalle |
|---|---|---|
| **404** | **30** | Páginas y categorías: `/habla-con-un-experto`, `/performance`, `/gestion-de-redes-sociales`, `/hubspot-onboarding`, `/socialboom`, `/agencia-diseno-estrategico`, los 3 webinars viejos, `category/digital`, `category/creative`, `category/marketing`, etc. |
| 301 (lo salva WordPress) | 24 | Posts con slug viejo; conservan la query. **En uno el destino difiere del de Yoast**: `project/wre-22-crossfit-worlds-relays-elementor` va a `project/jbq-crafting-official-collab-elementor11/` y no a `project/bighouse-design/` |
| **200 en la URL vieja** | 4 | `category/social`, `category/inbound/seo`, `category/diseno-web` y `category/loop-marketing/aeo` sirven contenido en la ruta antigua, sin redirigir (contenido duplicado) |

En los 410 con parámetro, la respuesta es 404 en vez de 410. Para retirar una URL los dos códigos sirven, así que
este caso se deja como está.

**Tráfico real:**
- **Logs de acceso de Kinsta**, unos 3,7 días (14 → 17 oct, ~24.300 líneas, procesados en el servidor sin
  extraer IPs): **0 peticiones reales** con parámetros a orígenes de redirect. Las 68 que aparecen son mis propias
  pruebas (`audit`, `test`, `x`, `nocache`).
- **GA4** (propiedad `486264460`, 12 meses):
  - 61 vistas de página 404 en total; sólo 1 en un origen de redirect, y sin parámetros.
  - **GA4 recorta la query de la URL de aterrizaje en esta configuración**, así que no puede medir este problema.
  - Sí registra sesiones atribuidas a `chatgpt.com`, `gemini` y `perplexity.ai`: los asistentes llegan con
    etiqueta de campaña.

**Cadenas de redirects** (no dependen de los parámetros, pero se encontraron en el mismo inventario): **8 cadenas**,
confirmadas en vivo. Por ejemplo `starsocial → socialboom → gestion-de-redes-sociales → servicio-marketing-de-contenidos`
(3 saltos), `about-ver4-copy → performance → gestion-campanas-publicitarias → servicio-gestion-campanas-publicitarias`
(3 saltos), y las de los posts de RUT y GA4. Lista completa en el dry-run de §5.2.

## 4. Opciones evaluadas

| Opción | Veredicto | Motivo |
|---|---|---|
| Un redirect regex de Yoast por cada URL afectada | ❌ | Es un parche por URL: habría que repetirlo en cada retiro, y hoy el sitio no tiene ningún regex |
| Un regex genérico en Yoast | ❌ | No puede expresar «el mismo destino que su versión plain»; duplicaría las reglas |
| Reglas en Kinsta/Nginx o Cloudflare | ❌ | Crea un segundo dueño de los redirects fuera de Yoast y del control de versiones de WordPress |
| Exportar los redirects de Yoast a Nginx | ❌ | En Kinsta requiere soporte manual y deja de sincronizarse con Yoast |
| Actualizar Yoast Premium | ⏸ | Conviene por higiene, pero no hay evidencia de que lo corrija |
| **mu-plugin que lee la opción de Yoast** | ✅ **Recomendada** | Yoast sigue siendo el único dueño de las reglas. Cubre todas las URLs, actuales y futuras, sin mantenimiento, y conserva las UTM para la atribución. Tiene kill switch y rollback en menos de 1 minuto |

## 5. Propuesta

### 5.1 mu-plugin `efeonce-redirect-query-passthrough.php`
- **Fuente versionada:** `efeoncepro/efeonce-public-site-runtime` →
  `wp-content/mu-plugins/efeonce-redirect-query-passthrough.php`. Test:
  `tests/redirect-query-passthrough.test.php`, **20 casos en PASS** con `php tests/redirect-query-passthrough.test.php`.
- **Comportamiento:** sólo actúa en peticiones GET/HEAD con query, y sólo si la ruta coincide con un origen
  *plain* de Yoast de tipo 301/302/307/308. En ese caso responde con el mismo código hacia el mismo destino, con
  la query original agregada. Ejemplo: `/habla-con-un-experto?utm_source=chatgpt.com` →
  `/agendar/?utm_source=chatgpt.com`.
- **Qué no toca:**
  - peticiones sin query (siguen en manos de Yoast);
  - los 410/451, POST, la home, admin, AJAX, cron y WP-CLI;
  - bucles y prefijos parecidos.
- **Seguridad y costo:**
  - limpia CR/LF de la cabecera `Location`;
  - sólo usa destinos que ya estaban en la opción de Yoast, que administra el equipo; no hay redirecciones
    abiertas nuevas;
  - la opción `wpseo-premium-redirects-export-plain` ya se carga automáticamente (`autoload=on`, 12 KB), así que
    no agrega consultas; el bucle recorre 115 entradas y sólo corre en peticiones con query.
- **Por qué corre al cargar el mu-plugin:** tiene que actuar antes que Yoast. Por eso no usa `wp_redirect()`
  (es pluggable y todavía no existe en ese punto) y envía las cabeceras directamente, con
  `X-Redirect-By: Efeonce redirect query passthrough`.
- **Efecto lateral positivo:** también corrige las 4 categorías que hoy responden 200 en la ruta vieja y el caso
  donde WordPress elige un destino distinto al de Yoast. Con parámetros, manda Yoast.
- **Kill switch:** `define( 'EFEONCE_REDIRECT_QUERY_PASSTHROUGH_DISABLED', true )` en `wp-config.php`.
  **Rollback:** borrar el archivo y purgar la caché.

### 5.2 Aplanar las 8 cadenas
Script guardado: `scripts/public-website/flatten-yoast-redirect-chains.php`.
- **Sin argumentos es dry-run.** Ya se corrió y su salida coincide con las 8 cadenas de §3.
- **Con `apply`:** guarda un snapshot (`_gh_yoast_chain_flatten_before_*`), verifica que cada destino siga igual
  antes de escribir y usa `WPSEO_Redirect_Manager::update_redirect`. El rollback restaura sólo los destinos que
  cambió.
- **Conviene correrlo después de cada retiro de URL:** PDR-022 va a enviar `/servicio-gestion-campanas-publicitarias/`
  a `/servicios/performance-marketing/`, y eso vuelve a formar cadenas con `performance` y `about-ver4-copy`.

### 5.3 Ventana de despliegue (requiere autorización)
1. `pnpm public-website:ssh-check`.
2. Instalar:
   `pnpm public-website:wpcli -- --eval-file ./scripts/public-website/install-redirect-query-passthrough.php --input-file ../efeonce-public-site-runtime/wp-content/mu-plugins/efeonce-redirect-query-passthrough.php --wp-user 12`.
   El script se niega si ya existe otro archivo con ese nombre, verifica el hash y purga la caché.
3. Aplanar las cadenas: el mismo eval-file de §5.2 con `apply`.
4. Verificar en vivo, sin sesión:
   - los 30 casos que hoy dan 404 responden 301 con la query conservada, en un solo salto;
   - sin query, nada cambia;
   - `/?utm_source=x`, `/agencia-creativa/?utm_source=x` y un post normal con UTM siguen en 200;
   - los 8 orígenes en cadena llegan en un salto;
   - el error log no muestra entradas nuevas.
5. Si algo falla: activar el kill switch o borrar el archivo, y restaurar el snapshot de las cadenas.

## 6. Pendiente de decisión del operador
- [ ] Autorizar la ventana de §5.3: mu-plugin y aplanado de cadenas.
- [ ] Opcional: programar la actualización de Yoast SEO Premium (27.7 → la versión alineada con Free), por
  higiene y no como solución de este problema.
