# Operar páginas misceláneas del sitio público

> Estado: runbook para discovery y futura implementación gobernada; no describe una capacidad ya publicada.
>
> Funcional: [`public-miscellaneous-surfaces.md`](../../documentation/public-site/public-miscellaneous-surfaces.md)
>
> Técnico: [`PUBLIC_MISCELLANEOUS_SURFACES_V1.md`](../../architecture/public-site/PUBLIC_MISCELLANEOUS_SURFACES_V1.md)

## Antes de empezar

- Trabaja read-only hasta tener autorización explícita de publicación.
- Revisa `git status --short` en Greenhouse y en `efeonce-public-site-runtime`.
- No cambies branch ni uses worktrees.
- No edites Ohio padre: una actualización del theme borraría el cambio.
- No asumas que Theme Builder gobierna 404/search/archive porque Elementor Pro esté activo.
- No despliegues el runtime completo cuando `fullRepoDeploySafe=false`.

## 1. Verificar acceso y runtime

```bash
pnpm public-website:ssh-check
pnpm public-website:runtime-status
```

Confirma:

- theme `ohio-child` y parent `ohio`;
- versiones activas;
- estado del runtime repo y drift;
- carril SSH/WP-CLI disponible;
- ausencia/presencia de templates Theme Builder y condiciones.

## 2. Clasificar la URL

No empieces por el diseño. Determina el query type y su contrato:

| Caso | Prueba mínima |
| --- | --- |
| 404 | URL inexistente y paginación fuera de rango |
| Search | `/?s=termino`, `/?s=sin-resultados` y `/?s=` |
| Category | categoría indexable, paginada y vacía si existe |
| Author | autor público con posts |
| Tag/date/custom taxonomy | estado robots/canonical propio |

Para cada URL registra HTTP, title/H1, robots, canonical, schema, template efectivo, `scrollWidth`, errores de
consola y destinos rotos.

## 3. Inspeccionar el owner efectivo

Usa el wrapper remoto; no ejecutes PHP arbitrario fuera del carril gobernado:

```bash
pnpm public-website:wpcli -- --eval-file ./tmp/<script-read-only>.php --wp-user 12
```

Consulta `get_404_template()`, `get_search_template()`, `get_index_template()`, theme locations de Elementor,
`elementor_library` y `_elementor_conditions`. El baseline 2026-08-31 es Ohio padre para 404/search/index y cero
templates/conditions especiales.

## 4. Revisar riesgos antes de proponer cambios

### Contenido

- Busca títulos con `Borrador`, `Draft`, `Demo`, `Prueba` o placeholders en resultados públicos.
- Verifica status, robots, canonical y sitemap de cada resultado sospechoso.
- No ocultes un problema editorial mediante CSS o filtros de presentación.

### Search

- Prueba consulta vacía.
- Inventaría tipos devueltos.
- Decide global vs. editorial antes de definir la query.
- No uses la búsqueda actual como única recuperación de la 404 hasta tener allowlist.

### Chrome

- Revisa sidebar, footer, redes, dirección, legales y enlaces externos.
- Registra la deuda global separadamente; no la incluyas de forma silenciosa en un paquete de 404.

## 5. Preparar la implementación

Para una nueva superficie visible:

1. Crea 2–3 direcciones visuales versionadas.
2. Decide `reuse | extend | new primitive`; el candidato actual es `PublicUtilityRecoverySurface`.
3. Define desktop, 390 px, copy, estados, teclado, motion/reduced motion y medición.
4. Implementa primero el first fold de 404 y solicita `ACCEPT FIRST FOLD`.
5. Sólo después amplía a search-empty y archive-empty.

Carril técnico recomendado:

- `404.php` child;
- partial `utility-page.php`;
- override `content-none.php` contextual;
- `searchform.php` accesible/localizado;
- `search.php` sólo si se rediseñan resultados completos;
- categorías/autor/tag/fecha en slices posteriores.

## 6. Snapshot y release

Antes de escribir o desplegar:

- exporta/reconcilia `ohio-child` live;
- snapshot de archivos exactos;
- snapshot de opciones/menú/media si habrá contenido editable;
- inventario robots/canonical/schema de control;
- manifest de paquete acotado;
- rollback exacto.

No uses deploy completo. El artefacto debe contener exclusivamente los archivos owned del child theme.

## 7. Verificación obligatoria

### Matriz HTTP/SEO

- 404 real y paginación imposible: `404`, `noindex`, sin canonical inventada.
- Search con/sin resultados: `200`, `noindex`, schema esperado.
- Categoría/autor/tag/fecha: verificar individualmente; sin reglas blanket.

### Navegador

- 1440, 1280 y 390 px.
- `<main id="main">`, skip link, un H1, headings coherentes.
- teclado, foco visible y controles con nombre.
- search vacío/no vacío y query con caracteres especiales.
- reduced motion.
- `scrollWidth === clientWidth` o scroller contenido documentado.
- footer/sidebar/destinos sin demo, placeholders ni 404 dentro del scope aprobado.

### Medición

- `page_view` en 404.
- `view_search_results` en search.
- Si se agregan eventos diagnósticos: outcome/result count/destino, sin query cruda duplicada.
- Verifica `dataLayer` y `/g/collect`; no infieras GA4 desde la presencia del script.

## 8. Rollback

1. Restaura los archivos exactos del child theme.
2. Restaura opciones/menú desde snapshot si fueron modificados.
3. Purga Kinsta.
4. Repite HTTP/robots/canonical/schema y browser desktop/390.
5. Documenta qué se retiró y la referencia recuperable.

## No hacer

- No editar `ohio/404.php`, `ohio/search.php` ni `ohio/index.php` directamente.
- No escribir `_elementor_data` directamente.
- No redirigir toda 404 al Home.
- No indexar búsquedas internas.
- No aplicar `noindex` global a todos los archivos.
- No copiar `index.php`/`search.php` completos para cambiar sólo un empty state.
- No enviar términos de búsqueda potencialmente sensibles en eventos custom.
- No mezclar 403/500/mantenimiento de infraestructura con la 404 WordPress.

## Escalamiento

Detén la publicación si:

- el owner efectivo cambió;
- aparece un template/condition Theme Builder no inventariado;
- el paquete incluye archivos fuera de `ohio-child` sin ownership aprobado;
- el runtime repo sigue sin permitir un artefacto acotado;
- el status/robots/canonical/schema difieren del contrato;
- persiste overflow, skip link roto o controles sin nombre.
