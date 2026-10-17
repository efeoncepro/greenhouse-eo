# Retiro de la landing legada `/agencia-diseno-estrategico/` con 301

> **Tipo de documento:** Plan de migración de URL (sitio público)
> **Versión:** 1.0
> **Creado:** 2026-10-17 por Claude (sesión con Julio Reyes)
> **Estado:** Propuesto · **nada publicado**. Ejecutar sólo con autorización explícita del operador.
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

## 6. Pendiente de decisión del operador
- [ ] Autorizar la ventana de ejecución en producción.
- [ ] Ítem de menú: reapuntar a `#marca` con el nombre nuevo, o quitarlo.
