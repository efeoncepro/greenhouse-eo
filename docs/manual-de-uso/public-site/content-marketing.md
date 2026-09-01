# Editar y verificar Content Marketing

Página `242603`: [landing pública](https://efeoncepro.com/servicio-marketing-de-contenidos/).
Antes de cambiar contenido o runtime, relee su estado y conserva un snapshot; los hashes y backups del
[contrato técnico](../../architecture/public-site/CONTENT_MARKETING_ELEMENTOR_MODULES_V1.md) son del
corte 2026-08-31. La publicación inicial no autoriza futuros cambios de producción fuera del pedido vigente.

## Edición de contenido y SEO

1. Abre la página con una cuenta que pueda editarla en Elementor. Conserva la plantilla predeterminada
   de Ohio y los trece contenedores; el header/footer son globales, no parte del export.
2. En el navegador de Elementor selecciona el módulo `Content · …`. Usa sus grupos Contenido para
   texto, URL o media; iconos son cadenas Tabler `ti ti-*`, no un picker visual. Comportamiento contiene
   Animaciones; Estilo contiene padding responsive. No renumeres keys ni reemplaces por HTML.
3. Un valor de origen repetido dentro del mismo módulo puede compartir control. Revisa los estados
   alternativos de tabs/cortes, además de la vista inicial, después de editarlo. El esquema no expone
   repeaters para añadir o eliminar filas: eso requiere una implementación del módulo.
4. Para cambiar campos, consentimiento o política de captura usa el lifecycle de Growth Forms. Las
   claves `form_key`/`form_surface` del módulo sólo enlazan el host con la definición publicada.
   `scripts/growth/publish-content-marketing-form.ts` evita republicar si ya hay versión y no se pasa
   `--revise`; `--revise --apply` crea, revisa y publica una nueva versión mediante commands canónicos.
   No lo uses para restaurar defaults sobre el copy vigente v3. El último pase usó
   `revise-content-marketing-form-copy.ts`, histórico y guardado contra v2; una nueva revisión requiere
   baseline actual y preservar policies/campos con los commands canónicos. No es un cambio meramente
   visual. El script inicial usa el entorno gobernado y la condición Node
   `react-server`; no cargues `.env.local` mediante `source` ni imprimas secretos.
5. Edita title, descripción, imágenes sociales y canonical en Yoast. Conserva la URL. El adapter PHP
   conecta un `Service` al grafo existente y lee la metadescripción de Yoast; cambiar la oferta/nombre
   de Service requiere revisar ese adapter, no pegar JSON-LD en un widget HTML.
6. Guarda y verifica en sesión pública: desktop/móvil, pin/tab, modo, avance/retroceso del formulario,
   teclado, reduced motion y fallback sin JS. El registro PHP y readback del documento ya se probaron;
   no sustituyen una prueba completa de edición visual, save y reload, todavía pendiente.

## Menú

La ruta es **Soluciones → Crecimiento Multicanal → Content Marketing**. Reutiliza el item `242917`
del menú primario `61`, enlazado al objeto página `242603`; no añadas otro item por encontrar el mismo
enlace varias veces en el HTML (Ohio renderiza variantes del menú). El título anterior era
«Content Marketing & SEO». El snapshot separado es `_gh_content_marketing_menu_20260831_122837`.

Para un cambio futuro toma baseline de todos los items (título, destino, padre y orden), edita mediante
WordPress y compara la lista completa después. WordPress reordenó tres posiciones durante la operación
inicial; se restauró la secuencia visible antes del cierre. La API de lectura normaliza `menu_order`
a 1..N: comparar esos rangos verifica la secuencia, no la igualdad byte a byte de valores raw de la
base. Comprueba menú abierto y navegación pública tras purgar caché.

## Verificación sin generar solicitudes

Desde el checkout compartido `greenhouse-eo`:

```sh
node scripts/public-website/verify-content-marketing-landing.cjs
node scripts/public-website/verify-content-marketing-seo.cjs
pnpm public-website:wpcli -- --eval-file ./scripts/public-website/verify-content-marketing-elementor.php --wp-user 12
pnpm exec vitest run src/growth-forms-renderer/__tests__
```

Los checks públicos escriben `.captures/content-marketing/{browser,seo}.json` y capturas por viewport.
Rellenan campos localmente y prueban validación, preselección y retorno entre pasos; no pulsan el envío
final. No prueban aceptación servidor, ledger, entrega comercial ni `generate_lead` en GA4. La auditoría
axe se conserva separada; esos comandos no regeneran `axe.json`. El check PHP compara páginas/shell
con el snapshot original: una diferencia puede ser un cambio posterior legítimo y requiere diagnóstico.
No reviertas páginas ajenas para forzar un resultado verde.

## Reconstrucción y actualización del paquete

1. Revisa `git status --short` en ambos checkouts compartidos. Guarda un baseline live reciente con
   `pnpm public-website:export-live-code`; usa su directorio de salida en el empaquetado.
2. El árbol extraído `tmp/content-marketing-source` debe contener `Landing Content Marketing v2.dc.html`,
   `_ds/` y `assets/{aro,logos}/`. Verifica el SHA256 del HTML contra el contrato técnico antes de
   ejecutar el compilador; éste calcula el digest pero no impide compilar otro archivo.
3. Inspecciona los scripts antes de ejecutarlos: compiler y client escriben en la ruta fija
   `/Users/jreye/Documents/efeonce-public-site-runtime`. No ofrecen override de destino. Preserva
   cambios ajenos en los archivos generados antes de reconstruir.

```sh
node scripts/public-website/compile-content-marketing-source.cjs
node scripts/public-website/content-marketing-client.cjs
node scripts/public-website/build-content-marketing-package.cjs '<directorio-baseline-live>'
```

El primer comando genera templates, schemas, source CSS, assets e intermedios en
`tmp/content-marketing-build`; el segundo consume esos intermedios. El tercero compila el renderer
canónico y empaqueta a `tmp/content-marketing-release/{package.zip,manifest.json}`. Sólo el tercero
admite `PUBLIC_SITE_RUNTIME_ROOT`. Ninguno regenera las clases PHP, `seo.php`, host CSS ni la portada
social: deben existir en el runtime compartido. Regenerar defaults no reemplaza settings ya guardados
por un editor; nunca repitas el cutover para imponer defaults nuevos.

Revisa el manifest y el diff de **todos** los archivos incluidos, especialmente
`includes/class-eo-widgets-loader.php`, que es compartido y se empaqueta completo. Un baseline válido
no excluye WIP ajeno del paquete. Con autorización vigente para desplegar ese cambio concreto:

```sh
pnpm public-website:wpcli -- --eval-file ./scripts/public-website/deploy-content-marketing-package.php --input-file ./tmp/content-marketing-release/package.zip --input-file ./tmp/content-marketing-release/manifest.json --wp-user 12
```

El deploy valida hashes, guarda backup, instala y purga caché. Si detecta deriva, vuelve a leer el live;
no cambies hashes para omitirla. Si falla después de comenzar a escribir, inspecciona el estado antes
de reintentar: la atomicidad es por archivo. Conserva el nuevo backup y verifica página, recursos y
formulario. Actualizar este bundle WordPress no despliega el renderer genérico de otros consumidores.

## Recuperación y límites

`publish-content-marketing-page.php` es el cutover inicial guardado contra el hash de la página vieja;
no debe repetirse sobre la landing actual. No es un comando idempotente de mantenimiento. El fallo de
readback de robots tras aquella escritura y su comprobación posterior están en la auditoría.

No hay rollback automático. Antes de restaurar comprueba disponibilidad del backup y deriva; los TAR
viven en `/tmp` del servidor y pueden desaparecer. Restaura sólo los elementos/settings afectados por
`Document::save()`, sus metas previas y archivos del paquete que correspondan; revisa
`created-paths.json` para no asumir que un TAR contiene la versión anterior de archivos nuevos.
No reviertas el loader completo, menú global ni páginas ajenas sin comparar los cambios posteriores.
Después regenera cachés y repite readback público. El snapshot de menú es independiente del de página.

El pin ya comprueba ancho ≥940 y alto ≥740 tanto al cargar como al redimensionar. Los contrastes
detectados se corrigieron con CSS de módulo. El smoke seguro prueba rechazo del API y transporte
GA4 sintético; no prueba una aceptación. Turnstile bloqueó el intento UI antes del POST.
Aceptación/ledger, Realtime, CWV y editor integral permanecen separados.
[Evidencia y comandos de repetición](../../audits/public-site/2026-08-31-content-marketing-technical-closure.md).

[Contrato técnico](../../architecture/public-site/CONTENT_MARKETING_ELEMENTOR_MODULES_V1.md) ·
[Auditoría y pendientes](../../audits/public-site/2026-08-31-content-marketing-publication.md).

## Patch editorial de las secciones iniciales

`content-marketing-editorial-copy.json` registra 118 cambios de la instancia, no defaults del plugin.
`update-content-marketing-copy.php` valida sin escribir por defecto y aplica sólo con segundo archivo
que contenga `APPLY`. El patch ya está publicado y su hash anterior impide repetirlo. Para otra edición,
obtén baseline nuevo y valores anteriores; nunca cambies la guarda sin revisar la deriva.
[Snapshot, readback y recuperación de este pase](../../audits/public-site/2026-08-31-content-marketing-editorial-copy.md).

El segundo patch, `content-marketing-hub-review-copy.json`, registra 83 cambios en hub/review
aplicados por el mismo writer. También es histórico, con guarda del estado anterior.
[Snapshot y QA del segundo pase](../../audits/public-site/2026-08-31-content-marketing-hub-review-copy.md).
El ajuste `content-marketing-hub-review-copy-refinement.json` sigue al segundo patch y abrevia cinco campos tras QA tablet; aplicar sólo un patch histórico no reconstruye el estado editorial final.

## Logos CMS y modalidades

El widget editorial expone controles «Logo CMS» (Media) y «Nombre CMS» para cuatro marcas.
Los defaults apuntan a assets versionados del plugin; modificar una instancia no requiere recompilar.
Conserva proporciones/colores y no conviertas los logos en acreditaciones. El adapter del compilador
agrega esos campos después de los originales, para no renumerarlos. Los assets CMS se mantienen
en el runtime; el compilador del export no los descarga.
`build-content-marketing-cms-package.cjs <baseline-json>` empaqueta sólo ocho archivos, sin loader.
Obtén hashes live de cada path de su allowlist antes de generar el paquete.
`verify-content-marketing-cms-modes.cjs` verifica copy, marcas, modos y fallback sin JS; complementa
los verificadores generales y de SEO. [Auditoría y rollback](../../audits/public-site/2026-08-31-content-marketing-cms-modes.md).

## Servicios conectados y FAQ

En Elementor, edita las URL de las seis tarjetas desde el widget «Servicios conectados». La tarjeta
completa es un enlace; conserva el destino de la landing vigente y comprueba H1/canonical al cambiarlo.
El widget «Preguntas frecuentes» conserva ocho preguntas y respuestas con apertura nativa. Revisa
coherencia con CMS, modalidades y aprobación al modificar su copy.
`verify-content-marketing-ecosystem-faq.cjs` verifica DOM, seis navegaciones y teclado/JS-off;
`--preview` aplica el patch sólo en el navegador local. El JSON de este pase es histórico, no un
writer reutilizable sin baseline nuevo. [Auditoría y recuperación](../../audits/public-site/2026-08-31-content-marketing-ecosystem-faq.md).

El tamaño de los dos wordmarks Efeonce en modalidades se gobierna en `content-marketing-host.css`,
relativo a su texto; no reducir el SVG ni reemplazarlo por texto rasterizado. El encabezado puede
partirse en dos líneas. [Cambio y rollback](../../audits/public-site/2026-08-31-content-marketing-mode-logo.md).

Para editar el cierre y el caso interno usa sus controles Elementor. Comprueba que «Copiar correo»
coincida con asunto/cuerpo visibles. El copy de los cinco campos, pasos y confirmación del formulario
se modifica mediante una nueva versión Growth Forms, conservando policies; nunca con un parche DOM.
`verify-content-marketing-business-conversion.cjs` comprueba copy, clipboard y pasos sin enviar leads.
[Versiones, snapshots y rollback](../../audits/public-site/2026-08-31-content-marketing-business-conversion.md).

## Equilibrio del cierre y diagnóstico de caché

La columna editorial final se equilibra abreviando la introducción, tres descripciones y la nota;
conserva título, pasos y tamaño de letra. `content-marketing-conversion-balance-copy.json` registra
ese patch posterior de cinco controles y no cambia el formulario v3. Al editar, revisa tanto el
primer paso como el segundo, a 1440/878/390; evita una altura fija que recorte validación o contexto.

Si el primer readback público aún muestra copy anterior, compara el documento guardado y la URL
normal con una lectura sin caché, después de purgar. No repitas `Document::save()` para resolver una
respuesta de caché. El estado esperado, snapshot y diferencias de altura verificadas viven en la
[auditoría de cierre](../../audits/public-site/2026-08-31-content-marketing-business-conversion.md#ajuste-posterior-equilibrio-de-columnas).
