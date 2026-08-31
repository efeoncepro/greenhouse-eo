# Indexabilidad de las páginas del menú público

2026-08-31. El operador autorizó quitar `noindex` de Redes Sociales y habilitar la indexación de
las páginas del menú. Se revisó la navegación asignada y la renderizada en el header público:
ubicación `primary`, menú `61`, 26 items: 18 páginas únicas y ocho agrupadores `#`.
Los enlaces sociales externos del header no son páginas administradas por este WordPress.

## Resultado

18/18 páginas con HTTP 200, URL final igual al destino, `index, follow`, canonical propio único,
sin `X-Robots-Tag` restrictivo y presentes en el sitemap de páginas. `blog_public=1` y robots.txt
permiten rastreo (`User-agent: *`, `Disallow:` vacío). No se cambió ninguna configuración global.

| Página | Ruta | Antes | Después |
| --- | --- | --- | --- |
| Home | `/` | Indexable | Sin cambios |
| Nosotros | `/about-us-efeonce/` | Indexable | Sin cambios |
| Partners | `/partnership/` | Indexable | Sin cambios |
| Portafolio | `/portafolio/` | Indexable | Sin cambios |
| Agencia Creativa | `/agencia-creativa/` | Indexable | Sin cambios |
| Producción Creativa | `/agencia-creativa-v2/` | Indexable | Sin cambios |
| Branding | `/agencia-diseno-estrategico/` | Indexable | Sin cambios |
| Diseño y Desarrollo Web | `/desarrollo-sitios-web/` | Indexable | Sin cambios |
| Performance Marketing | `/servicio-gestion-campanas-publicitarias/` | Indexable | Sin cambios |
| Content Marketing | `/servicio-marketing-de-contenidos/` | Indexable | Sin cambios |
| SEO | `/servicios/posicionamiento-seo/` | Indexable | Sin cambios |
| AEO | `/aeo-2/` | Indexable | Sin cambios |
| Inbound | `/agencia-inbound-marketing/` | Indexable | Sin cambios |
| Redes Sociales | `/servicios/redes-sociales/` | noindex, sin canonical emitido ni sitemap | Indexable |
| Influencer Marketing | `/servicios/agencia-de-influencers/` | Indexable | Sin cambios |
| Servicios HubSpot | `/servicios-contratar-hubspot/` | Indexable | Sin cambios |
| Blog | `/blog/` | Indexable | Sin cambios |
| Contacto | `/contacto/` | Indexable | Sin cambios |

## Cambio aplicado

Sólo página `251300`: `_yoast_wpseo_meta-robots-noindex` de `1` a `2` mediante API nativa de meta.
Yoast reconstruyó su indexable; se limpió su caché de sitemap y se purgó Kinsta. El canonical ya
estaba almacenado correctamente: Yoast volvió a emitirlo al quitar el bloqueo, sin override nuevo.
No hubo `Document::save()`, escritura Elementor, despliegue de plugin ni cambios de title/description.
Los 18 posts/contenidos y árboles Elementor, otras metas SEO/thumbnail, menú y opciones protegidas
conservaron sus hashes/valores. No se tocaron páginas fuera del menú, backups, pilotos ni drafts.

Writer histórico: `scripts/public-website/enable-menu-page-indexing.php`, con permisos, baseline,
identidad, pertenencia al menú, hash y valor previo verificados antes de escribir.
Snapshot persistido: `_gh_menu_indexability_20260831_163136`.
Evidencia anónima antes/después: `.captures/menu-indexability/{before,public-before,public-after}.json`.
Scratch de lectura/publicación: `tmp/menu-indexability/`. No repetir el writer sobre el estado nuevo.

Rollback: verificar ausencia de cambios posteriores; restaurar sólo el meta anterior desde el snapshot,
reconstruir el indexable de `251300`, limpiar sitemap y purgar. No revertir páginas o menú completos.

## Alcance de la evidencia

Es habilitación técnica para indexarse, no confirmación de indexación en Google. No se solicitó ni
se verificó rastreo en GSC. Google necesita volver a rastrear para observar el cambio:
[documentación oficial de noindex](https://developers.google.com/search/docs/crawling-indexing/block-indexing).

Observación SEO separada: Partners y Portafolio no incluyen H1 en el HTML inicial auditado. No bloquea
la indexación y no se cambió diseño/copy como parte de este pedido. No se afirma una auditoría SEO
integral ni conformidad de schema/CWV. La mutación se aplicó en WordPress; versionar este registro
y su writer no vuelve a publicar ni solicita indexación.
