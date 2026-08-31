# Editar y recuperar la landing HubSpot

1. Abre WordPress → Páginas → página `244079` → Editar con Elementor.
2. Selecciona uno de los once widgets «HubSpot · …». Edita textos, enlaces o Media en Contenido;
   las preguntas, escenarios y paneles usan colecciones. Conserva las claves de presentación al editar.
3. No dupliques anclas; hero, hubs, familias y evaluacion deben ser únicas. No elimines paneles dejando
   botones que los referencian. La colección permite reordenar contenido; un cambio estructural requiere QA.
4. Guarda y comprueba escritorio, 390 px, teclado, enlaces y formulario. Preserva imagen destacada `248703`,
   el header/footer nativo y los ajustes de wrapper full width de esta página.
5. Para cambiar campos/consentimiento/destinos usa authorDraftForm → reviewForm → publishForm en Growth Forms;
   nunca modifiques una versión publicada ni agregues un formulario de Elementor independiente.

Verificación reproducible anónima: `node scripts/public-website/verify-hubspot-landing.cjs`.
La prueba no crea leads aceptados. La comprobación PHP `verify-hubspot-elementor-live.php` crea un draft
transitorio, prueba texto y reordenación con Document::save, relee/renderiza y lo envía a papelera.
`verify-hubspot-package.php` compara hashes del manifest con runtime, sin escribir páginas.

## Recuperación con autorización

Respaldo durable de contenido/metas originales: opción `_gh_hubspot_rollback_20260830`, verificada
contra revisión Elementor `251801`, hash `b453e9d1ba9a4094c886d230b5436bd293e036cec69f0d43d821614b4d0b35ce`.
La opción conserva el árbol de elementos, settings y las metas capturadas antes del cambio.
El primer snapshot JSON en postmeta no es la fuente de rollback: las barras escapadas se perdieron;
se preservó y verificó la revisión exacta en la opción serializada indicada.

Antes de recuperar, verifica drift. Restaura `elements`/`settings` mediante Document::save (incluida
imagen destacada explícita), y sólo las metas de página/Yoast cambiadas. No escribas `_elementor_data`
directamente ni modifiques Home/menús/footer. Reinstala únicamente archivos del paquete si fuera necesario.
El respaldo inicial del loader vive en `/tmp/eo-hubspot-before-20260831-014151.tar` en Kinsta;
los archivos nuevos están listados en su `created-paths.json`. El manifest/audit fechado registra las
correcciones posteriores; no asumas retención indefinida de `/tmp`. Exporta antes de usarlo.
Tras restaurar: limpia CSS Elementor y cache Kinsta; comprueba URL, imagen, SEO y render anónimo.

La URL no cambió. `/servicios/hubspot/` y su 301 siguen siendo otro alcance; no migrarlos implícitamente.

## Operar SEO

Edita título, metadescripción, breadcrumb y social en Yoast. El schema de servicio reutiliza título nativo y
descripción, sin duplicar Organization ni publicar precios/ratings no respaldados. Para cambiar el perfil del
partner usa el control «Fuente · perfil oficial de HubSpot» del módulo Caso.

El snapshot `_gh_hubspot_seo_20260831_093553` conserva el estado anterior. Restaura sólo campos afectados,
no todo el postmeta sobre ediciones posteriores. Reconstruye el indexable Yoast y purga cache después.
`_eo_hubspot_seo_enabled` desactiva por página los filtros SEO, la redirección HTTP y la optimización exclusiva;
no borres archivos requeridos por el loader. El título H1 y la configuración Elementor no se reescribieron.

Para reproducir el subset, usa FontTools/WOFF2 sobre Tabler 3.24.0 con los unicodes declarados en
`hubspot-elementor.css`, `--drop-tables+=GSUB` y `--flavor=woff2`; verifica contornos y fallback de un icono
no incluido. El mapa CSS completo y licencia MIT se conservan. No recortes la edición a sólo 11 iconos.
[Audit y rollback](../../audits/public-site/2026-08-31-hubspot-seo-aeo.md).

Verificación SEO pública: `node scripts/public-website/verify-hubspot-seo.cjs` (sin login ni escrituras).

Timeline/partner: `node scripts/public-website/verify-hubspot-timeline.cjs` comprueba cinco etapas, puntos,
línea, teclado, movimiento reducido, 1414/768/390 px y contenido sin JS, sin enviar leads.
La revisión de dos columnas retira sólo los controles f029–f031 del módulo Caso; no renumerar f032 ni anteriores.
[Respaldo y recuperación de esta revisión](../../audits/public-site/2026-08-31-hubspot-timeline-partner-fix.md).

## Iconografía oficial y caso ANAM

Marketing, Sales, Service, Content, Data y Revenue incluyen sus SVG oficiales de Brandfolder, sin
modificar colores ni proporciones. Los seis controles «Icono oficial» son Media nativos del widget Hubs.
El widget Caso incluye «Logo · ANAM» y su texto alternativo; en escritorio se alinea a la derecha del
encabezado y en móvil se apila. La nota identifica el caso ANAM por instrucción del operador.
No se modifican cifras, title, descripción SEO, header ni footer.
[Fuentes, publicación y rollback](../../audits/public-site/2026-08-31-hubspot-brand-assets.md).

Revisión posterior: Smart CRM y agentes suman sus isotipos. En agentes se usa el recurso actual «Agent Hub»
del proveedor, sin renombrar el contenido aprobado. El mismo Media de cada tarjeta gobierna el logo del
panel seleccionado. No se identificó un logo oficial de AEO; se usa el icono semántico de búsqueda descrito abajo. «Licencias y operación» incluye el
logo completo claro de HubSpot; el operador confirmó autorización.
[Fuentes y evidencia](../../audits/public-site/2026-08-31-hubspot-product-marks.md).

MCP reutiliza los tres PNG originales de ChatGPT, Claude y Gemini de la página AEO: controles Media
`brand_chatgpt_logo`, `brand_claude_logo`, `brand_gemini_logo`, compartidos entre tarjeta y panel.
Grupo compacto sobre discos claros, sin recolorear archivos ni cambiar copy. No se modificó AEO.
[Fuentes y rollback](../../audits/public-site/2026-08-31-hubspot-mcp-logos.md).

Revisión semántica: las cinco tarjetas restantes (AEO, Sales Workspace, Customer Success Workspace,
Marketing Studio, Enablement) incorporan iconos Tabler descriptivos en azul claro `#cddeeb` y cinco
Media `brand_*_semantic_icon`. Se comparten con su panel SSR; las marcas oficiales no se recolorean.
Las 14 tarjetas tienen identidad visual; AEO usa un símbolo de búsqueda, no un isotipo oficial atribuido
a HubSpot. [Mapa, fuentes y rollback](../../audits/public-site/2026-08-31-hubspot-semantic-icons.md).

## Editar copy sin revertir revisiones aprobadas

1. Relee la página y su árbol Elementor antes de editar. La última evidencia registrada (2026-08-31,
   11:27:34 UTC) tiene hash `cc9710c8adca07e54058c31e7edcecb0a80d78d2c95abf3e8042f3bddd2afe72`;
   no asumas que sigue siendo el estado vivo en una sesión posterior.
2. Conserva el overlay `scripts/public-website/hubspot-editorial-copy.json` en sus siete módulos:
   licensing, proof-ledger, conversion, assessment, faq, sectors y delivery. Se aplica **después** del
   adapter de marcas; no edites el export original ni uses una recompilación global como publicación.
3. Para cambios aprobados, sincroniza sólo los defaults/repeaters afectados en los schemas y guarda
   los campos de la página por Document::save. Los defaults por sí solos no sobrescriben lo guardado.
   Preserva Media, `_layout`, IDs, anclas, imagen destacada y settings; compara el árbol antes/después.
4. Valida texto completo, cuatro paneles sectoriales y cinco etapas, teclado, reduced motion y anchos
   1414/878/390. `verify-hubspot-copy.cjs` y `verify-hubspot-section-copy.cjs` cubren estas revisiones;
   actualiza sus expectativas sólo cuando cambie el copy aprobado. Repite SEO y formulario sin crear leads.
5. Tras purgar, comprueba la URL pública normal sin interceptar respuestas. Si aún muestra caché anterior,
   espera y vuelve a leer; no reejecutes una mutación que ya tuvo un readback correcto.

### Recuperación editorial selectiva

| Revisión | Snapshot de contenido | Backup de schemas | Alcance |
| --- | --- | --- | --- |
| Licencias, ANAM/partner y reunión | `_gh_hubspot_copy_20260831_111837` | `/tmp/eo-hubspot-before-20260831-112012.tar` | licensing, proof-ledger, conversion, assessment, faq |
| Industrias, primer paso y método | `_gh_hubspot_copy_20260831_112547` | `/tmp/eo-hubspot-before-20260831-112652.tar` | sectors, assessment, delivery |

`assessment` aparece en ambas revisiones: restaurar completo el snapshot anterior borraría la segunda.
Comprueba drift y recupera sólo los campos necesarios mediante guardado nativo, junto a sus schemas y
al overlay correspondiente; no sobrescribas todo el postmeta ni escribas `_elementor_data` directamente.
Verifica la existencia de los respaldos temporales antes de depender de ellos. Manifests, hashes y deltas
exactos viven en las auditorías de [copy inicial](../../audits/public-site/2026-08-31-hubspot-editorial-copy.md)
y [sectores/método](../../audits/public-site/2026-08-31-hubspot-industry-method-copy.md).

### Baselines y herramientas de revisión editorial

Los verificadores `verify-hubspot-copy.cjs` y `verify-hubspot-section-copy.cjs` funcionan en modo live sin
archivos temporales: verifican contenido e interacciones actuales. Para comparar HTML anterior usa
`--baseline=/ruta/al/html-anterior`; sin ese archivo informan la comparación como no realizada, nunca
como «sin cambios». La prueba de sectores/método mantiene no-JS en ambos modos live.

`--preview` requiere render local reciente: ejecuta `php ../efeonce-public-site-runtime/tests/hubspot-modules.test.php render`
y guarda la salida en el directorio temporal indicado por cada verificador. El preview del timeline usa
`tmp/hubspot-visual-fix/rendered.html` y sustituye los módulos completos vigentes, no selectores de la versión antigua.
El compilador y los scripts iniciales de publicación son herramientas operativas con fuentes externas y
snapshots específicos: lee sus entradas y realiza preflight; no representan un rebuild/deploy autónomo desde Git.
