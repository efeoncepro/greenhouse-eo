# Content Marketing: propuesta interna, conversión y formulario

2026-08-31. Pedido del operador: mejorar la redacción completa de `#internal-case`,
`#content-marketing-conversion` y el formulario. Skills: copywriting, UX content, WordPress público,
Growth Forms y QA. Se conserva el diseño; cada contenido se edita en su fuente canónica.

## Cambios publicados

48 textos Elementor: 38 en business y 10 en conversion. El caso interno ayuda a evaluar el servicio
con cinco puntos concretos y un correo adaptable, sin presentarlo como testimonio ni acuerdo firmado.
La continuidad editorial depende del alcance; desaparecen garantías de tráfico y fechas universales.
La conversión explica el contacto inicial, evaluación del apoyo y acuerdo de alcance antes de producir.

Growth Forms publica v3, con 17 valores editoriales revisados: labels/placeholders, títulos/ayudas de
paso, CTA «Enviar mi consulta» y confirmación. Se mantienen las claves, tipos, required, validadores,
límites, opciones/valores, consentimiento, aviso de privacidad, enlaces y todas las policies.
«Continuar», «Atrás», validación y estados de sistema conservan el copy compartido del renderer.
No cambia seguridad, Turnstile, clasificación, retención, analytics, surface ni destino.

El botón «Copiar correo» utiliza los mismos valores nativos editados que renderizan asunto y cuerpo.
El original copiaba constantes del export y secuencias literales de salto; ahora aplica el lookup
editorial y separa párrafos con saltos reales. Confirmación «Correo copiado» conserva el estado original.
Sólo se despliega `assets/js/content-marketing.js`, generado por `content-marketing-client.cjs`.
No cambia el renderer de formularios ni su bundle fijado en WordPress.

## Publicación y recuperación

- Patch Elementor: `content-marketing-business-conversion-copy.json`; writer existente con allowlist
  de business/conversion, dry-run verificado y `Document::save()`.
- Hash anterior: `88df573273e33edb84cc67fffda3f86fd0f4168d1bbccea92be6726e8e7f5488`.
- Snapshot: `_gh_content_marketing_copy_20260831_164044`.
- Hash posterior: `76765b72cfeb0b7a86cf6f91008b30180cc3ff05e617f63fdbca6147f918a967`.
- Readback del árbol completo igual al esperado; once módulos ajenos, SEO/thumbnail, menú, shell y
  cinco páginas protegidas sin cambios. Cachés Elementor y Kinsta purgadas.
- Backup JS: `/tmp/eo-content-marketing-before-20260831-164022.tar`. Su retención es temporal.
  Antes del deploy, el bundle local sin el nuevo bloque coincidía con el SHA de producción.
- Form key: `18b228e9-106a-402e-a6f2-a8c5469e73d7`; surface `fhsf-efeonce-content-marketing`.
- Versión anterior v2: `fver-94c14bc6-6ba8-4b4b-82f9-24fe7470abea` (deprecada tras verificar v3).
- Versión nueva v3: `fver-e96ca2e9-d2b2-4f72-ad50-33d2b2be9245`.
- Writer: `scripts/growth/revise-content-marketing-form-copy.ts`, guardado contra v2 y baseline
  leído del store canónico. Usa `preserveFormVersionFields`, author → review → publish → readback.
  Compara policies y campos de la nueva versión; cero destinos y misma identidad/surface.

Rollback por carril: comparar deriva y revertir sólo los campos Elementor editados; restaurar sólo
el JS desde TAR si no tiene cambios posteriores; para el formulario, clonar el contenido de v2 a una
nueva versión por commands, review/publish y deprecar la reemplazada después del readback. Nunca
editar en sitio una versión publicada ni cambiar destinos para recuperar el copy.
Los writers históricos rechazan el estado posterior y no deben repetirse con guardas inventadas.

## Verificación

`verify-content-marketing-business-conversion.cjs --preview` pasó en 1440/878/390: 48 controles,
clipboard exacto con saltos reales y confirmación asíncrona, campos obligatorios vacíos bloqueados,
dos pasos, Content Engine preseleccionado, edición y retorno conservando modalidad/contexto/nombre.
La variante preview sólo sustituye respuesta/runtime WordPress localmente; el formulario usa su
contrato publicado. No se intercepta ni simula una solicitud aceptada.

El verificador sin flag pasó en producción en 1440/878/390, con clipboard exacto, validación,
dos pasos, preselección y retención de datos. Cero errores y cero solicitudes de envío; fallback
sin JavaScript disponible. Evidencia: `.captures/content-marketing/business-conversion/`.
Se inspeccionó también la captura pública móvil de conversión.

La verificación general pasó en 1440/1280/890/390: trece módulos, un H1, header/footer presentes,
interacciones y teclado, reduced motion y fallback sin JavaScript; sin errores ni respuestas fallidas.
El documento no presenta desbordamiento horizontal; las tablas conservan su desplazamiento interno.
La verificación SEO confirmó HTTP 200, index/follow, título, descripción, canonical, imagen social,
grafo Yoast con Service, sitemap y siete destinos enlazados con HTTP 200.
Readback final confirmó las cinco páginas protegidas, SEO y menú sin cambios; el JS publicado
coincide con el manifest: `95e9b0076368dbb0ea5729a67c9390c6aa38f34a9e9eef0bca20a8fe968ceed6`.

La nueva confirmación se verifica en el contrato publicado, sin generar un lead para mostrarla.
Consentimiento y privacidad conservan su texto/enlace; la URL de privacidad visible es presentación
compartida del renderer y no se sustituyó desde WordPress. Los numerales partidos de la lista en tablet
pertenecen al diseño previo, sin corrección estética en este pase.

No se enviaron leads, correos ni mensajes al equipo del visitante. Copiar sólo escribe el portapapeles.
GSC, CWV, contraste global, editor GUI y smoke de conversión GA4 permanecen fuera de esta evidencia.
Sin commit/push. [Contrato](../../architecture/public-site/CONTENT_MARKETING_ELEMENTOR_MODULES_V1.md) ·
[Formulario](../../architecture/growth-public-forms-runtime-contract.md#content-marketing-presentación-host-y-distribución-del-renderer).

## Ajuste posterior: equilibrio de columnas

La revisión del operador detectó exceso de altura en la columna de texto. Se eligió condensar
cinco controles existentes (introducción, tres descripciones y nota) conservando el título y los
tres pasos. No se reduce la tipografía ni se estira el formulario; tampoco se añade CSS o JS.
Rigor ui-lite, composición aprobada reutilizada. En preview, la diferencia de altura pasó de
87/78 px a 18/27 px en 1440/878; móvil conserva el apilado y una lectura más breve.

Patch `scripts/public-website/content-marketing-conversion-balance-copy.json`: cinco controles
de conversion, antes/después completos, sobre el hash `76765b72…a967`. Writer canónico ahora
admite uno o dos módulos declarados, manteniendo identidad, controles y hash como guardas.
Dry-run de cinco campos y `Document::save()` verificados; snapshot
`_gh_content_marketing_copy_20260831_194706`, hash posterior
`b8d379697673969a8add5ece01e0b41c12563907470555768febe8c79b14f753`.
Los doce módulos restantes, SEO, shell, menú y páginas protegidas permanecen intactos.
No cambia la versión v3 del formulario ni ningún archivo desplegado del plugin.
Rollback: revertir únicamente esos cinco campos desde el snapshot mediante Document::save,
tras comprobar que no hay ediciones posteriores, y purgar las cachés.

El verificador mantenido incorpora el patch posterior y mide ambas columnas en el primer paso.
Las capturas de comparación viven en `.captures/content-marketing/conversion-balance/`;
la comprobación pública de copy, clipboard y formulario usa la carpeta business-conversion.

Verificación pública final PASS: alturas 484/502 px en 1440 y 453/480 px en 878;
móvil 390 apilado, sin desbordamiento del documento. Capturas tablet y móvil inspeccionadas.
Los dos pasos, validación vacía, selección de modalidad, retorno con datos conservados, clipboard
y fallback sin JS pasan, sin errores ni solicitudes de envío. SEO vuelve a pasar. La primera
lectura recibió caché anterior; la URL normal y con bypass mostraron luego el copy nuevo y
el verificador pasó sin repetir el save.

## Cierre documental y versionado autorizado

El operador dio por finalizada la entrega visual y pidió tres subagentes para reconciliar docs y
skills, seguido de commit. Se actualizaron arquitectura, funcional, manual, task/wireframe, contrato
Growth Forms y sus referencias; WordPress mantiene estado vigente e índice de auditorías, con
aprendizajes reutilizables de copy/clipboard, logos, caché e indexabilidad. Ambos mirrors coinciden.
AGENTS, CLAUDE y project_context no requieren cambios: no nace un contrato transversal ni una skill.
Los pendientes del alcance ampliado de TASK-1799 permanecen explícitos y no bloquean este commit
de la entrega ya publicada; no se marcaron como pruebas realizadas.

Runtime: commit `f12dd64` en efeonce-public-site-runtime. Readback de ocho archivos (CSS, JS,
schema/template editorial y cuatro logos) coincide byte a byte con el checkout; hash Elementor
final `b8d379697673969a8add5ece01e0b41c12563907470555768febe8c79b14f753` confirmado de nuevo.
QA de cierre: CMS/modalidades PASS (53 campos, cuatro logos, nueve cambios de modo, tres anchos);
ecosistema/FAQ PASS (43 controles, navegación y fallback); copy/form/clipboard/columnas y SEO
PASS en el pase inmediatamente anterior. PHP lint y sintaxis Node PASS. Scripts, patches y docs
se versionan por separado en greenhouse-eo. No se incluyen WIP Home/Agencia, secretos, capturas
ni payloads privados; no se hace push ni una nueva publicación al registrar los commits.
