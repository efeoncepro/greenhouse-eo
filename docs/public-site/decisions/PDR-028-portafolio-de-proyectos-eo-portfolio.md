# PDR-028 — Portafolio de proyectos del sitio público («EO Portfolio»)

> **Tipo:** Product Decision Record de plataforma del sitio público.
> **Estado:** Accepted · 2026-10-23 · el operador aprobó la propuesta auditada con `arch-architect` y el orden de
> ejecución por etapas. Quedan abiertas las decisiones de §Pendientes del operador; ninguna bloquea la etapa 1.
> **Ejecución:** [EPIC-056](../../epics/to-do/EPIC-056-eo-portfolio.md) con cuatro tasks en orden: `TASK-2046`
> (limpieza de los demos de Ohio), `TASK-2047` (plugin y contenido), `TASK-2048` (portada y entrada) y `TASK-2049`
> (migración y salida a producción).
> **Incidente asociado:** [ISSUE-183](../../issues/resolved/ISSUE-183-portfolio-ohio-demo-entries-indexed.md) — 44 entradas
> demo del tema Ohio publicadas e indexadas.
> **Diseño en revisión:** canvas «Portafolio Efeonce — concepto», página «EO Portfolio» —
> [claude.ai/artifact/Rb6NHjgnSRqMK963jPwtUm](https://claude.ai/artifact/Rb6NHjgnSRqMK963jPwtUm) (versión 13 al
> 2026-10-23): portada índice con lente y entrada de Sky Airline. La página «Ronda 1 · exploración» es historia, no
> dirección.
> **Runtime afectado:** `efeonce-public-site-runtime` (WordPress en Kinsta, tema `ohio-child`, plugins propios).
> **Relacionados:** [PDR-020](PDR-020-canales-propios-sistema-editorial.md) §4.3 (casos de éxito con compuerta de
> cliente) · [PDR-024](PDR-024-axis-en-el-sitio-publico-composicion-agentica.md) (AXIS en el sitio, versión fija) ·
> [PDR-026](PDR-026-cada-landing-deriva-su-patron-de-diseno.md) (mecanismos, no estéticas) ·
> [PDR-027](PDR-027-navegacion-global-del-sitio-portable.md) (patrón de contenido con tres puertas) ·
> [Plan de migración a La órbita](../LA_ORBITA_SITE_MIGRATION_PLAN_V1.md) §Oleada 5.

## Contexto

`/portafolio/` es la página más antigua del sitio que todavía se enlaza desde el menú global, la Home («Cases») y el
pie («Casos de éxito»). La auditoría del 2026-10-23 (curl sobre el sitio en vivo, la API REST y el código del tema y
del plugin Ohio Portfolio 1.1.3) encontró:

- **El tipo de contenido `ohio_portfolio` tiene 59 entradas publicadas; sólo 15 son trabajo de Efeonce.** Las otras 44
  son demos del tema (cliente «Envato», enlace de afiliado `1.envato.market`, imágenes del CDN de Colabrio) y están
  en `ohio_portfolio-sitemap.xml`. Cada entrada real termina llevando a ellas por «Next Project». Es
  [ISSUE-183](../../issues/resolved/ISSUE-183-portfolio-ohio-demo-entries-indexed.md).
- **Las 15 entradas reales arrastran restos del demo:** un bloque en inglés «Got a project? Get a Quote» que enlaza a
  `ohio.clbthemes.com`, el botón «Open Project» de Bresler, Flick y Ghamadent apuntando al afiliado de Envato, y 10
  entradas con la fecha por defecto «junio 3, 2020».
- **El modelo de Ohio no sirve para un portafolio que cuenta contexto:** sólo Task, Strategy, Design y Client como
  texto libre en inglés; un solo video por proyecto, como iframe de YouTube o Vimeo; la galería rechaza mp4; no hay
  proporción por pieza; los campos viven en ACF privado y la REST no los expone.
- **La portada no tiene H1**, muestra 5 de los 15 proyectos, y su botón principal abre un lightbox en vez de la
  entrada. Las imágenes van sin `alt`, sin dimensiones y sin `srcset`; algunas pesan entre 1 y 2,6 MB.

PDR-020 §4.3 decidió que un caso tiene tres profundidades (cifra citable, caso completo en el blog, recorte de
LinkedIn), que se cuenta como método y que no se publica sin aprobación del cliente. También dejó escrito que **no
existe una superficie que agregue los casos y que crearla es una decisión de producto aparte**. Este PDR es esa
decisión.

## Decisión

**El sitio tiene un portafolio de proyectos propio, «Portafolio» para el visitante y «EO Portfolio» como nombre
interno del plugin. Cada proyecto cuenta para quién se hizo, qué tenía que resolver, cómo se hizo y qué pasó, con sus
piezas en su formato real, imagen o video. Se construye con el patrón de PDR-027 (contenido validado con tres
puertas, render del servidor) y reemplaza al tipo de contenido de Ohio.**

### 1. Qué es el portafolio y qué no

| Superficie | Qué es | Dónde vive |
|---|---|---|
| **Portada** `/portafolio/` | Índice de proyectos con su contexto mínimo (cliente, para quién, línea, formatos) y vista previa de sus piezas. | Plugin `eo-portfolio` |
| **Entrada** `/portafolio/<slug>/` | El proyecto: ficha, reto, idea y ejecución, resultados con fuente, piezas por capítulo, testimonio, equipo. | Plugin `eo-portfolio` |
| **Caso completo** | La narrativa larga, el método paso a paso. Sigue siendo **canónico en el blog** (PDR-020). | Blog / Content Factory |

- La entrada **no duplica** el caso del blog: lo resume en tres pasos y enlaza a él. Si un proyecto no tiene caso en el
  blog, la entrada se sostiene sola.
- El portafolio es **atemporal**: la portada no lleva año. Cada proyecto conserva su periodo como dato propio
  (decisión del operador en el canvas, 2026-10-23).
- «EO Portfolio» nunca aparece como texto visible (decisión del operador en el canvas, 2026-10-23).

### 2. El contenido: un documento validado por proyecto, con tres puertas

- **Tipo de contenido propio** `eo_project` (slug público `portafolio`), en un plugin del runtime. Cada proyecto guarda
  **un solo documento estructurado** validado contra un esquema versionado; no campos sueltos de ACF.
- **El esquema vive en el plugin** (`schema/portfolio-entry.v1.json`) mientras haya un solo consumidor. Se promueve a un
  contrato de AXIS (`efeonce.portfolio-entry`) cuando exista un segundo consumidor real (Think o el sitio en Astro).
  *Ajuste de la auditoría:* el primer borrador proponía el contrato en AXIS desde el inicio; con un solo consumidor la
  reutilización es una hipótesis, y un contrato prematuro obliga a dos releases por cada cambio de campo.
- **Tres puertas sobre el mismo servicio de guardado** (como `eo-site-nav`):
  1. **Admin de WordPress** para personas, con la estructura del documento.
  2. **WP-CLI** para agentes: `wp eo-portfolio export|validate|apply|publish`, por la vía gobernada
     (`pnpm public-website:wpcli`), con foto previa y todo-o-nada.
  3. **JSON público de lectura** (REST `GET /wp-json/eo/v1/portfolio` y por proyecto) para que el contenido no quede
     atrapado en WordPress. Sólo expone proyectos publicados.
- **Taxonomías controladas, no libres:** línea de servicio (enum: Growth, Brand, Engine, Voice, Revenue), servicio
  (del catálogo `docs/services/`) e industria. Las 42 categorías de Ohio no se migran.

### 3. Lo que el sistema no deja pasar (invariantes)

1. **Sin aprobación del cliente no se publica.** Un proyecto no pasa a publicado sin `clientApproval` con referencia,
   fecha y alcance (`logo`, `pieces`, `metrics`, `testimonial`). Cada elemento visible respeta su alcance: sin
   alcance `metrics` no se muestran cifras; sin `logo`, va el nombre en texto. Falla cerrado en las tres puertas.
2. **Toda cifra lleva su fuente.** Una cifra sin `source` no pasa la validación. La órbita de medida sólo se dibuja con
   un porcentaje real con fuente.
3. **La proporción se calcula de la pieza, no se declara.** Cada medio guarda sus dimensiones reales; el formato
   (9:16, 4:5, 1:1, 16:9, 3:1, otros) se deriva de ellas. Una etiqueta escrita a mano no manda.
4. **Toda imagen tiene `alt` y todo video con voz tiene subtítulos.** El esquema los exige.
5. **El render no depende del cliente.** Ninguna plantilla decide por nombre de cliente o de campaña: capítulos, foco
   de la lente, cifras y testimonio son datos; cada sección desaparece si no tiene contenido. Se prueba con tres
   proyectos de forma distinta: completo (Sky), mínimo (PabellonToGo) y sólo texto (ANAM).
6. **El documento inválido no rompe la página:** se sirve la última versión válida; si no existe, el proyecto no se
   lista.

### 4. Medios

- **Imágenes:** biblioteca de medios de WordPress (para tener `srcset`, tamaños y CDN de Kinsta), con dimensiones y
  `alt` en el documento.
- **Video:** bucket público de AXIS en `portfolio/v<N>/<slug>/`, con nombres versionados e inmutables y caché de un año,
  como las fotos del menú (PDR-027 §3): mp4 H.264, póster webp y VTT. No se sube video a la biblioteca de WordPress
  (ancho de banda de Kinsta). Lo suben agentes u operadores con credenciales de GCP; el plugin no las tiene.
- **Reproductor:** `efeonce.video-player` de AXIS mediante el bloque `eo-axis-video` del runtime, regenerado desde la
  versión fijada vigente antes de activarlo (hoy está construido sobre primitives 0.6.5 y no está activo).

### 5. Render y experiencia

- **Servidor primero, sin React** (PDR-024 y PDR-027): plantillas PHP del plugin para la portada y la entrada, con
  tokens y piezas de AXIS en versión fija. JavaScript liviano sólo para mejorar.
- **Filtros como enlaces reales** (`/portafolio/?linea=brand`), no sólo JavaScript, para que se puedan rastrear.
- **Video responsable:** sin reproducción automática con «reducir movimiento»; reproducción sólo en pantalla; control
  de pausa visible en todo video que se mueva más de 5 segundos (WCAG 2.2.2); póster como respaldo.
- **SEO:** un H1 por página, `ItemList` en la portada, `CreativeWork` y `VideoObject` en la entrada, título,
  descripción y OG propios, y un sitemap nuevo.
- **Línea gráfica:** La órbita. La lente de la portada es la única órbita de su sección; la órbita de medida aparece
  sólo con un porcentaje con fuente; un acento por página según la línea del proyecto.

### 6. Qué pasa con Ohio

- Las **44 entradas demo** se despublican (borrador, no se borran) y responden **410**. No tienen valor que preservar.
- Las **15 entradas reales** se migran al tipo nuevo. Las que tienen aprobación del cliente se publican en
  `/portafolio/<slug>/` con **301** desde `/project/<slug>/`; las que no, quedan en borrador y su URL antigua redirige
  a `/portafolio/`.
- El plugin **Ohio Portfolio** se desactiva tras 30 días sin tráfico residual a `/project/`. No se elimina.
- Antes de cualquier redirección se revisa Search Console (LA_ORBITA_SITE_MIGRATION_PLAN_V1 §1).

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Mantener `ohio_portfolio` y sumarle campos | Hereda las categorías del demo, el video por iframe, campos invisibles para la API y layouts que no controlamos. |
| Una página de Elementor por proyecto (patrón de las landings) | No escala a 15 o más proyectos y la portada no puede armarse a partir de los datos. |
| Construirlo ahora en Think (Astro) | Divide el sitio antes de que exista la migración a Astro (PDR-003). El JSON público deja esa puerta abierta. |
| Greenhouse como dueño de los datos | Más ingeniería de la necesaria hoy. El documento guarda un enlace opcional a la organización de Greenhouse. |
| Contrato en AXIS desde el inicio | Un solo consumidor; ver §2. |

## Pendientes del operador

1. **Diseño:** aprobar o ajustar la portada y la entrada del canvas antes de `TASK-2048`.
2. **Aprobaciones de cliente:** qué proyectos tienen aprobación y con qué alcance. PDR-020 nombra a Sky, Bresler, Berel
   y ANAM como citables; el resto queda en borrador hasta tenerla.
3. **Dato de Sky:** el caso publicado dice 88 % a tiempo y la landing de Agencia Creativa dice 94 %.
4. **Pie del sitio:** si «Casos de éxito» pasa a llamarse «Portafolio».
5. **Proyectos que nunca consigan aprobación:** quedan en borrador o se retiran.
6. **Video largo:** si se agrega HLS (hoy sólo VOD nativo está verificado en el reproductor).

## Consecuencias

- `/portafolio/` deja de depender del tema Ohio; la migración a Astro hereda datos limpios por la puerta JSON.
- El blog sigue siendo dueño del caso largo; el portafolio lo enlaza.
- La compuerta de cliente pasa de ser una regla editorial (PDR-020) a una regla del sistema.
- El plan de migración a La órbita cierra la decisión 5 para `/portafolio/` (`/partnership/` sigue abierta).

## Fuentes

- Auditoría del sitio en vivo, la API REST y el código de Ohio Portfolio 1.1.3 (`efeonce-sp/update-ohio/`), 2026-10-23.
- Auditoría de arquitectura con `arch-architect`, 2026-10-23 (veredicto: avanzar con cuatro ajustes, incorporados aquí).
- Caso «Un año con Sky» (`sky-efeonce`, experiencia.efeoncepro.com) y casos de ANAM en el blog (posts 251397 y 251432).
