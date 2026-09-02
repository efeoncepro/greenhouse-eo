# Content Marketing — publicación y QA, 2026-08-31

**Resultado:** landing publicada y verificada; QA funcional/SEO PASS, accesibilidad completa y
conversión extremo a extremo pendientes. No se declara cerrado el alcance ampliado de TASK-1799.

## Evidencia de publicación

Página `242603`, `/servicio-marketing-de-contenidos/`, 13 contenedores y 13 widgets semánticos
Elementor; cero widgets HTML/iframe. Diseño aprobado conservado salvo chrome nativo y captura real.
Fuente, hash, snapshot y rollback en
[arquitectura](../../architecture/public-site/CONTENT_MARKETING_ELEMENTOR_MODULES_V1.md).

- `Document::save()` guardó contenido/settings; posterior lectura comparó cada setting de los trece widgets.
- La primera publicación se detuvo en el readback de `_yoast_wpseo_meta-robots-nofollow`: Yoast normaliza
  `0` a cadena vacía. No se repitió el cutover; se leyó estado real, se comprobó `index, follow` y se purgó
  cache. Se corrigió la expectativa del script inicial para futuras revisiones.
- Hash documental final `dd6275695aa878020d6471c91ab121ed36b175b16c417ccd3732797d8c86f020`.
- Home `251731` y páginas `244079`, `251279`, `251300`, `251627` conservaron hashes. Front-page,
  sidebars, widget_block, theme_mods_ohio-child y ohio_options conservaron valores.
- Se verificó registro real de controles Elementor y render PHP. No se certifica edición visual completa
  dentro del panel autenticado de Elementor.

## Pruebas ejecutadas

- `verify-content-marketing-landing.cjs`: 1440/1280/890/390 px, ancho del documento igual al viewport,
  un H1, trece módulos hidratados, header/footer presentes; sin errores JS ni respuestas >=400 observadas.
- Último capítulo por click permanece seleccionado después de scroll programático; tabs de cinco
  formatos, tres vistas del hub, tres cortes, modos y FAQ. Flechas de teclado en tablist verificadas.
- Sin JS y reduced motion: siete capítulos y ocho FAQs disponibles, sin overflow de página.
- Formulario: tres errores ante primer paso vacío; avance con datos locales, modo preseleccionado
  Content Engine, retroceso conserva nombre. **No se pulsó enviar ni se creó un lead.**
- `vitest src/growth-forms-renderer/__tests__`: **78 passed, 8 files passed**. Regresión del select nativo
  cubierta por comportamiento real; suite HubSpot preservada.
- PHP syntax y node syntax de scripts; `ui:readiness-check --task TASK-1799` PASS.
- QA/router gates son advisory y no sustituyen estas observaciones.
- Evidencia visual pública con Playwright headless, conforme al modo WordPress de la skill GVC. El MCP
  browser compartido estaba ocupado; se promovió la prueba a script repo-level, sin interferir su perfil.
  Artefactos: `.captures/content-marketing/{browser,seo,axe}.json`, `live-<width>-<section>.png`.

## SEO/AEO publicado

Title: **Agencia de Content Marketing y Content Ops | Efeonce**.

Descripción: **Estrategia, producción y operación de contenidos con Efeonce. Del research a la
publicación en tu CMS, con revisión visible y adaptación para cada canal.**

- HTML inicial completo; title/description/OG/Twitter consistentes, imagen social propia de 1200×630,
  canonical original, `index, follow`, sin X-Robots noindex.
- Grafo Yoast: un WebPage, ImageObject, BreadcrumbList, WebSite, Organization y Service conectado;
  sin IDs duplicados. FAQ visible no se convierte en promesa de rich result comercial.
- Siete destinos internos verificados HTTP 200, incluida agenda y servicios hermanos.
- URL presente en page sitemap. Esto no prueba indexación ni ranking actual en Google.
- No se hizo migración de slug, keyword research regional nuevo, inspección GSC ni certificación CWV.

## Hallazgos y límites

1. **Corregido:** compensación global de gutters de Ohio desplazaba los nuevos contenedores 16 px.
   Override específico para la página y contenedores propios; cero cambio de chrome global.
2. **Corregido:** hidratación podía recrear el form host. El nodo se conserva y sólo se preselecciona modo
   antes de la primera entrada; no se reinicia la captura por otros cambios de estado.
3. **Corregido:** el select nativo del renderer no restituía valores iniciales al pintar opciones.
4. **Pendiente, medio:** axe encuentra la regla `color-contrast` (74 nodos en el estado analizado),
   incluidos estados atenuados aún no completados, números inactivos, disclosure y magenta del export.
   No hubo otras reglas A/AA reportadas en el scope de la landing. Se conserva la estética expresamente
   aprobada; este resultado impide declarar WCAG AA o scorecard premium completo.
5. **Pendiente:** smoke de solicitud aceptada, lectura del submission ledger y `generate_lead` en GA4.
   Definición/versiones y carga pública verificadas; ello no prueba un envío aceptado ni su entrega.
6. **Pendiente:** CWV con laboratorio/perfil de red acordado, GSC/research del alcance original y prueba
   completa de save/reload en editor. No se inventa score numérico para cerrar TASK-1799.

Sin commit, push ni despliegue Vercel. Archivos de WordPress desplegados por paquete acotado;
form publicado mediante commands canónicos. Cambios ajenos del checkout compartido preservados.

## Cierre de código y documentación

ESLint focal y `git diff --check` sin hallazgos propios; bundle minificado del renderer comparado
byte por byte con la fuente final. `task:lint TASK-1799` sin errores/advertencias y `ops:lint --changed`
sin errores (advertencias históricas de child parity en epics ajenas a esta entrega).
`docs:closure-check` sin errores; conserva advertencias por el monolito histórico de Growth Forms y
por WIP de skills/contexto. `project_context.md` fue revisado: no cambia contrato durable global y no
se amplía. Las referencias nuevas están en ambos namespaces, registry y manual.

## Menú — actualización solicitada después de publicar

El item existente `242917`, menú primario `61`, ya apuntaba a la página `242603` bajo
**Soluciones → Crecimiento Multicanal**. Se actualizó «Content Marketing & SEO» a **Content Marketing**
sin duplicarlo. Snapshot `_gh_content_marketing_menu_20260831_122837`.
WordPress reordenó tres posiciones al guardar; se restauró la secuencia visible mediante su API de
posts y se verificó que la única diferencia semántica final fuera el título. La lectura
`wp_get_nav_menu_items()` normaliza `menu_order`; el snapshot conserva esos rangos, no todos los
valores raw persistidos. No se afirma restauración byte por byte del almacenamiento. Caché purgada;
enlace visible al desplegar Soluciones y navegación comprobados en el navegador público.

## Reconciliación documental con tres subagentes

Por pedido del operador, tres subagentes revisaron fuentes, artefactos y documentación con ownership
separado: landing/índices, WordPress/skills y Growth Forms/skills. El agente principal reconcilió task,
epic, contratos UI, auditoría y handoff. No se hizo commit ni se mutó producción en este pase.

- Documentación técnica/funcional/manual enlazada desde índices, PRIMITIVES e inventario de widgets.
  Defaults del export, settings de Elementor y variantes del renderer quedan separados.
- Manual de reconstrucción aclara ruta fija del compilador, secuencia real de comandos, archivos no
  regenerados, loader compartido y riesgo de empaquetar WIP ajeno. No se ofrece atomicidad global ni
  rollback automático; el corte inicial no es un actualizador idempotente.
- Skills WordPress y Growth Forms tienen referencias y mirrors actualizados. SEO ya cubría los
  aprendizajes relevantes; no se duplicaron reglas ni se alteró su WIP anterior.
- Task/contratos UI separan planificación previa de export aprobado publicado; criterios comprobados
  marcados, compuestos incompletos abiertos y EPIC-019 enlaza sólo esta task adicional.
- Menú: secuencia visible restaurada, con la precisión sobre `menu_order` indicada arriba.
- **Hallazgo funcional pendiente confirmado:** a 1440×650 el stage monta con altura `auto`; después
  de redimensionar a 1440×651 pasa a `338vh`. El mount exige altura ≥740 y el handler de resize sólo
  comprueba ancho ≥940. Evidencia: `.captures/content-marketing/resize-short-viewport.json`.
  No se corrigió ni desplegó por esta solicitud documental; owner: implementación de TASK-1799.
- Se reejecutó lectura pública SEO y reader Elementor: HTTP 200, metadatos/grafo/sitemap válidos,
  trece módulos y hash publicado preservado. Esta comprobación no repite un submit aceptado ni CWV.
- `task:lint`, `ui:readiness-check` y `design-contract:lint` PASS. Mirror gate general PASS; WordPress
  y Growth Forms se comparan además directamente porque no están incluidos en su allowlist.

`project_context.md`, `AGENTS.md` y `CLAUDE.md` no reciben nueva narrativa: el router de dominios ya
cubre estas skills y el estado concreto pertenece a sus fuentes canónicas. No se actualizó memoria.

## Versionado local solicitado

Runtime WordPress: commit `73493a8` con 47 archivos; sólo registro y require de Content Marketing
seleccionados del loader compartido. Greenhouse acompaña renderer, scripts y documentación en un
commit enfocado, preservando WIP Home/SEO/Social/Creative. Sin push ni nueva publicación.
El chequeo staged del runtime reportó whitespace final en templates HTML compilados y dos SVG del
export: se conservan esos bytes ya publicados, sin reformatear assets como efecto del commit.
Esto no se presenta como un `diff --check` limpio del paquete generado. PHP y JS se validan por sus
parsers y el renderer por las pruebas registradas.
