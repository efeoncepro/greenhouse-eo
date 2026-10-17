# Retiro de la landing legada `/agencia-diseno-estrategico/` con 301

> **Tipo de documento:** Plan de migración de URL (sitio público)
> **Versión:** 1.1
> **Creado:** 2026-10-17 por Claude (sesión con Julio Reyes)
> **Última actualización:** 2026-10-17 por Claude — ejecutado en producción
> **Estado:** **Ejecutado 2026-10-17 16:15 UTC** con autorización del operador («Redirigir y quitar del menú»). Ver §7.
> **Rail técnico:** [`taxonomy-permalink-migrations.md`](../../.claude/skills/efeonce-public-site-wordpress/references/taxonomy-permalink-migrations.md) (Yoast SEO Premium, `WPSEO_Redirect_Manager`)
> **Relacionados:** [TASK-1803 Branding Studio](../tasks/to-do/TASK-1803-landing-branding-studio-sistema-marca.md) · [Agencia Creativa vigente](../architecture/public-site/AGENCIA_CREATIVA_ELEMENTOR_MODULES_V1.md) · [PDR-004](decisions/PDR-004-landing-agencia-creativa-posicionamiento.md) · precedente de retiro con 301: [PDR-022](decisions/PDR-022-landing-performance-marketing-posicionamiento.md) / TASK-1865

## 1. Por qué se retira

La página `247526` (`/agencia-diseno-estrategico/`, menú «Branding & Identidad de Marca») no se modifica desde el
2025-10-01 y quedó por debajo del estándar del sitio:

- **Copy de catálogo:** describe servicios, pero no la tensión del cliente; no tiene mecanismo propio ni CTA de la escalera vigente.
- **Prueba sin fuente:** las cifras redondas (100 marcas, 1.000 piezas, 92 % de aprobación en primera entrega)
  contradicen el caso publicado de Sky, que suma más de 2.000 piezas en 12 meses.
- **Señales de abandono:**
  - testimonios triplicados en el carrusel;
  - testimonio de SSilva (branding) etiquetado como «Paid Media»;
  - testimonio de Eusari con una meta «al cierre del 2025»;
  - texto del formulario cortado.
- **Marca superada:** presenta «Globe by Efeonce» como la agencia, cuando Globe hoy es un producto comercial distinto.
- **Territorio con dueño nuevo:** Branding Studio (TASK-1803) define la marca, `/agencia-creativa/` la activa y
  `/agencia-creativa-v2/` la escala. Esta URL es la «superficie legada» que TASK-1803 pide resolver.

## 2. Medición (2026-10-17)

| Fuente | Resultado |
|---|---|
| Search Console (`greenhouse_growth.seo_gsc_daily`, `sc-domain:efeoncepro.com`, 2026-08-03 → 2026-10-14) | **0 clics · 16 impresiones** · posición media 18,4 |
| Consultas que la muestran | `efeonce` (10 impr., pos. 1), `once creativos` (4, pos. 65), `motion graphic designer santiago de cuba` (2) — ninguna de intención comercial de branding |
| Semrush · Backlinks (URL) | **0 backlinks · 0 dominios de referencia** (`backlinks_overview` = nothing found; `backlinks_pages` del dominio lista la URL con 0/0). El dominio tiene 610 backlinks / 423 dominios, casi todos a la home |
| Semrush · Orgánico CL (URL) | Sin keywords en el top 100 |
| Enlaces internos | 3 por página en todo el sitio: menú desktop, menú móvil y mega-menú, ítem «Branding & Identidad de Marca». En el contenido no se encontraron enlaces; falta confirmarlo con la búsqueda del preflight |
| Sitemap | Incluida en `page-sitemap.xml`; canonical propio; HTTP 200 |

**Límites de la medición:**
- La serie GSC propia parte el 2026-08-03. Antes de esa fecha no hay histórico local; la consulta a la API a 16 meses
  no corrió porque la sesión local no tenía la configuración OAuth.
- Las filas query×page excluyen consultas anonimizadas, así que 16 es un piso, no el total.
- Ninguno de los dos límites cambia la conclusión: no hay equity que proteger.

**Conclusión:** la URL no tiene tráfico ni enlaces externos. Un 301 no arriesga nada y evita que la página siga
restando credibilidad desde el menú.

## 3. Decisión de destino

**301 `/agencia-diseno-estrategico/` → `/agencia-creativa/` (página `249582`) ahora.**

- **Por intención y contenido:** `/agencia-creativa/` es la landing vigente con nivel de estándar (publicada el
  2026-10-15). Tiene la sección «Brand & Campaign Systems» (`#marca`) y ya capta la única consulta de branding
  observada: «agencia de rebranding latam», posición 17,7.
- **No se usa `/agencia-creativa-v2/`:** es Producción Creativa (escala), no branding.
- **No se espera a Branding Studio:** TASK-1803 está bloqueada por decisiones comerciales, casos y slug. Mantener la
  legada viva mientras tanto cuesta credibilidad y no protege nada.
- **No se usa 410:** la URL está en menús, favoritos y PDFs comerciales antiguos. Llevar al visitante a la oferta
  vigente vale más que un «no existe».

**Cuando Branding Studio se publique**, se **edita el mismo redirect** para apuntar directo a su slug, sin cadena.
No se agrega un segundo salto. El ítem de menú se reapunta en la misma ventana.

## 4. Plan de ejecución (una sola ventana, con autorización)

### 4.1 Preflight (sólo lectura)
1. Verificar Yoast SEO Premium activo y `class_exists('WPSEO_Redirect_Manager')`.
2. Inventariar redirects Yoast existentes con origen o destino `agencia-diseno-estrategico` o `agencia-creativa`, con y
   sin barra final (evitar colisiones y bucles).
3. Buscar la URL legada en `post_content`, `_elementor_data`, widgets, menús y opciones de Ohio. Registrar ID por
   ocurrencia; hoy se espera sólo el ítem de menú en sus tres renders.
4. Identificar el ID del ítem de menú «Branding & Identidad de Marca» y su grupo (`Soluciones`).

### 4.2 Snapshot y rollback preparados antes de mutar
- Snapshot de la página `247526`: estado, `_elementor_data`, `_elementor_page_settings` y metas Yoast (index/canonical).
- Snapshot del ítem de menú: URL, título y orden.
- Script de rollback que **sólo** retire el `WPSEO_Redirect` creado por este plan y restaure página y menú. Nunca
  reescribe la opción completa de redirects de Yoast.

### 4.3 Cambio (misma ventana)
1. Crear `WPSEO_Redirect('agencia-diseno-estrategico', 'https://efeoncepro.com/agencia-creativa/', 301, 'plain')`.
   Revisar después cómo lo guardó Yoast: con o sin barra final.
2. Ítem de menú: reapuntar a `/agencia-creativa/#marca` y renombrarlo «Branding y sistemas de marca». Así no
   quedan dos ítems con la misma URL y el clic cae en la sección que responde a esa intención. Alternativa más
   simple: quitarlo del menú; queda a decisión del operador.
3. Si el preflight encuentra enlaces en el contenido, reemplazarlos por la URL final, nunca por la legada.
4. Pasar la página `247526` a `private`, sin borrarla. Así sale del sitemap y el contenido queda recuperable.
5. Purgar la caché de WordPress y Kinsta.

### 4.4 Verificación pública (anónima)
- `curl -sI` a `/agencia-diseno-estrategico/` y `/agencia-diseno-estrategico` → **un solo salto 301** a
  `https://efeoncepro.com/agencia-creativa/`, que responde 200. Sin cadenas ni bucles.
- `page-sitemap.xml` sin la URL legada; `/agencia-creativa/` sigue con canonical propio e `index, follow`.
- Menú renderizado en home y en dos páginas internas: ninguna ocurrencia de `agencia-diseno-estrategico`.
- Search Console: inspeccionar la URL legada y ver «Página con redirección». En 2–4 semanas confirmar que salió del
  índice y que `/agencia-creativa/` no perdió impresiones.

### 4.5 Rollback (< 5 min)
Retirar el redirect creado, devolver la página a `publish`, restaurar el ítem de menú desde el snapshot y purgar caché.

## 5. Fuera de alcance
- Rediseñar o parchar la legada: no se invierte en ella.
- Crear Branding Studio: eso es TASK-1803. Este plan sólo deja el redirect listo para reapuntarlo.
- Las piezas del portafolio enlazadas desde la legada (`/project/*`) siguen vivas; no se tocan.

## 6. Decisiones del operador
- [x] Ventana de ejecución autorizada el 2026-10-17.
- [x] Ítem de menú: **quitado** (no se reapuntó a `#marca`).

## 7. Ejecución y evidencia (2026-10-17)

**El preflight encontró tres cosas que el plan no había previsto:**
- Ya existía el redirect Yoast `soluciones-de-diseno-para-marketing-que-convierten` → `agencia-diseno-estrategico`.
  Se **reapuntó** a `agencia-creativa` para no dejar una cadena de dos saltos.
- Dos posts publicados enlazaban a la legada:
  - `246315` (`/marketing-digital/contratar-agencia-de-marketing/`): 3 enlaces con el texto «branding»;
  - `249056` (`/loop-marketing/express-voz-marca-ia-loop-marketing/`): 1 enlace «aquí».
  En los dos se reemplazó la URL por `https://efeoncepro.com/agencia-creativa/` (atributos `href` e `id`).
- El ítem de menú era el `247616` del menú `61` (`primary`), hijo de `244255` «Estrategia & Posicionamiento», sin hijos.

**Cambios aplicados (`--wp-user 12`, por el wrapper WP-CLI):**
1. Redirect Yoast nuevo: `agencia-diseno-estrategico` → `agencia-creativa`, 301, plain. Los redirects pasaron de 114 a 115.
2. Redirect existente reapuntado: `soluciones-de-diseno-para-marketing-que-convierten` → `agencia-creativa`.
3. URL legada reemplazada en los posts `246315` y `249056`; quedan 0 ocurrencias.
4. Ítem `247616` eliminado del menú; el menú pasó de 28 a 27 ítems.
5. Página `247526` pasada a `private`, sin borrarla.
6. `wp cache flush` y `wp kinsta cache purge --all`.

**Verificación pública (anónima):**
- `/agencia-diseno-estrategico/`, `/agencia-diseno-estrategico` y `/soluciones-de-diseno-para-marketing-que-convierten/`
  → **un solo 301** a `https://efeoncepro.com/agencia-creativa/`, que responde 200 con canonical propio.
- `page-sitemap.xml` ya no contiene la URL legada.
- La URL legada aparece 0 veces en `/`, `/agencia-creativa/`, `/contacto/` y los dos posts editados.
- El menú renderizado muestra todos los demás ítems (3 renders cada uno). El submenú «Soluciones» se revisó en
  desktop: «Estrategia & Posicionamiento» quedó con Agencia Creativa y Producción Creativa. El menú móvil sólo se
  verificó en el HTML, no visualmente.
- El primer `curl` al slash devolvió 200 por la caché del borde de Cloudflare/Kinsta mientras propagaba. Un minuto
  después respondía 301 (`x-kinsta-cache: MISS`).

**Snapshot y rollback:**
- El snapshot quedó en la opción WP `_gh_legacy_diseno_retire_before_20261017T161537Z`. Guarda:
  - el estado de la página;
  - el post y las metas del ítem de menú, más la secuencia completa del menú;
  - el redirect encadenado original;
  - el `post_content` y el hash de ambos posts.
- Rollback:
  1. borrar sólo el redirect `agencia-diseno-estrategico`;
  2. devolver `soluciones-de-diseno-para-marketing-que-convierten` → `agencia-diseno-estrategico`;
  3. restaurar el `post_content` de los dos posts desde el snapshot;
  4. recrear el ítem con `wp_update_nav_menu_item()` (parent `244255`, `menu_order` 12) y validar la secuencia
     contra la que guardó el snapshot;
  5. devolver la página a `publish`;
  6. purgar caché.
  Script local: `tmp/legacy-diseno-rollback.php` (no versionado; recibe la clave del snapshot).

**Hallazgo de todo el sitio, fuera de alcance:** los redirects *plain* de Yoast **no se activan cuando la URL trae
parámetros**:
- `/agencia-diseno-estrategico/?utm_source=x`, `/habla-con-un-experto?utm_source=x` y
  `/soluciones-…/?utm_source=x` responden **404**;
- los posts con slug viejo sí redirigen conservando la query, por la redirección nativa de WordPress.
Esto ya ocurría antes de este cambio y afecta a todo enlace de campaña con UTM que apunte a una URL redirigida.
No se parchó para esta URL sola; queda como follow-up de plataforma.

**Siguiente paso:** inspeccionar la URL legada en Search Console y, en 2–4 semanas, confirmar que salió del índice
sin pérdida de impresiones en `/agencia-creativa/`. Cuando se publique Branding Studio (TASK-1803), se editan
**los dos** redirects para que apunten directo a su slug.
