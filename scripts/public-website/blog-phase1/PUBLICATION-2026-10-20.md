# Publicación del blog — corte de preparación 20/10/2026

El operador autorizó «Ok despleguemos en el sitio». La autorización corresponde al blog aprobado y sus dependencias de suscripción/medición; no se interpreta como promoción de todos los cambios ajenos presentes en develop.

## Alcance preparado

- Runtime candidato `3d9ee81` de `efeonce-public-site-runtime`, develop. ZIP acotado de20 archivos,478877bytes. Sólo sustituye un archivo existente: `includes/class-eo-widgets-loader.php`; su diferencia respecto del export live es únicamente el registro `EO_Blog_Section_Widget`. Los19 restantes son archivos propios del blog.
- Página WordPress18456 `/blog/`: siete widgets nativos en el cuerpo. Header/footer, CF7 compartido, settings Ohio, SEO, portada, posts, categorías y URLs se preservan.
- Growth Forms: versión `fver-c6b28627-385c-43fc-995d-588bc0290fd0`, formulario `efeonce-blog-subscription`, surface `fhsf-efeonce-blog-subscription`.
- HubSpot: reutilizar formulario `8c7cf91b-a1c9-4cbe-9d8c-cac773692561`, portal48713323, tipo535702717. No crear otro formulario.
- GTM: corregir el tag existente de subscribe de `sign_up` a `gh_newsletter_subscription_accepted`. No ampliar Ads/Meta ni cambiar Server.

## Evidencia fresca

- SSH preflight correcto contra `https://efeoncepro.com`.
- Export Kinsta: `tmp/public-site-code-baselines/2026-10-20T23-40-36-431Z/`,940 archivos. El deploy completo del repositorio **no es seguro** por drift/WIP ajeno; utilizar sólo paquete acotado con hashes frescos.
- Preflight de WordPress `2026-10-20T23:42:09Z`: controles nativos y renders de las siete secciones correctos, ejecutando PHP candidato desde temporal. Novedades produce vacío por política de frescura, como estaba previsto. No instaló archivos ni modificó página/opciones.
- Captura local del documento y metas: `.captures/2026-10-20-blog-publication/wordpress-preflight.json`; hash Elementor `3508e426f27eb3172cb483acb5ec80eb02f981683295b706a7ee5bb622de078a`. Se debe revalidar justo antes del write y crear snapshot durable remoto.
- Lectura Forms/HubSpot `2026-10-20T23:40:49Z`: review,0 versiones publicadas, compilación correcta, Gmail permitido, consentimiento requerido, Turnstile requerido, contrato HubSpot correcto,0 políticas comerciales. GTM Web7 aún usa `sign_up`.
- `origin/main` de Greenhouse conserva `communications: []`; el código de consentimiento preparado no está liberado. No crear recibo de release ni publicar Forms anticipadamente.
- Prueba del adaptador:19/19 tests PASS. Diff mínimo preparado en `.captures/2026-10-20-blog-publication/greenhouse-prerequisite.patch`: adaptador HubSpot, su test, `.github/workflows/ci.yml` y `.github/workflows/ci-deep.yml` (Ubuntu24.04 para compatibilidad del navegador).4 archivos,143 inserciones y4 eliminaciones.

## Decisión pendiente

Se solicitó al operador una excepción expresa a la regla de la skill `greenhouse-production-release` que prohíbe cherry-pick a main de commits existentes en develop. Objetivo: promover únicamente los cuatro archivos necesarios mediante PR y orquestador, sin promover los424 archivos del diff global develop/main ni WIP sin commit. La autorización de publicación ya está recibida; sólo la excepción de promoción permanece pendiente de respuesta.

Mientras no exista respuesta, no ejecutar esa promoción ni activar Forms/cutover. No se realizó push, merge, release, publicación GTM/Forms, instalación runtime, modificación de página ni envío de prueba en este corte.

## Secuencia al resolver la promoción

1. PR limitado y release canónico con CI, Vercel, revisión worker y manifest reales. Guardar readback compatible de `communications`.
2. Corrección GTM desde versión/fingerprint frescos, preview aislada, publicación y readback.
3. Publicar Forms mediante comando gobernado y verificar contrato público.
4. Revalidar manifest/runtime y documento, guardar respaldo durable, instalar paquete acotado; verificar widget con Elementor real antes de reemplazar el cuerpo por `Document::save`.
5. Releer árbol/metas protegidas, purgar caché y verificar blog público desktop/móvil, enlaces, imágenes, formulario y Turnstile.
6. Acordar correo autorizado para un único envío real; verificar entrega y preferencia HubSpot y recepción GA4 independientes. No hay correo de prueba acordado en este corte.

Checklist detallado de consentimiento/entrega/medición: [PUBLICATION-CHECKLIST.md](../blog-growth-form/PUBLICATION-CHECKLIST.md). Su antiguo alcance de reemplazo de un único widget debe entenderse ampliado al cuerpo completo del blog aprobado; las protecciones globales permanecen.
