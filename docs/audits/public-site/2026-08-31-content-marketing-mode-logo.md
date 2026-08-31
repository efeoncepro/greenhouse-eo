# Content Marketing: tamaño de marca en modalidades

2026-08-31. Ajuste visual solicitado sobre los dos wordmarks Efeonce de `#operating-modes`:
tarjeta «Operado por» y encabezado de su columna. Página `242603`, sin cambio de copy ni de assets.

## Decisión e implementación

Polish `ui-lite`, source-led; se reutiliza el SVG negativo editable existente. La tarjeta pasa de
`.86em` a `1.3em`, centrada verticalmente respecto al texto; el encabezado pasa de `11px` a `1.75em`.
A 878/390 px son 22,875 px y 21 px de alto respectivamente; desktop 1440 usa 28,078 px y 21 px.
La cabecera permite wrap cuando texto/logo no caben juntos; no reduce ni comprime la imagen.

Sólo `assets/css/content-marketing-host.css`, acotado a `.gh-content-module--modes`.
Los overrides `!important` sustituyen únicamente alturas/alineación del export inline y funcionan
en SSR e hidratación, sin duplicar reglas en templates/client. No afecta otros logos, widgets o páginas.
El compilador no genera este host CSS; no se modifica el diseño exportado ni se recompila el cliente.

## Publicación y control

- CSS anterior: `fc91a5f8ed224a696a6ec0123585671b14f1f640e316f96c7ecded7aade2b3b9`.
- CSS nuevo: `377ff04a501d60599e811d3380fd1104c4098339dd3a19d66408c4c9b2c3a3be`.
- Antes de empaquetar se comprobó que el CSS local sin el nuevo bloque coincide exactamente con producción.
- Paquete de un archivo, writer existente `deploy-content-marketing-package.php`, guarda SHA previa,
  backup TAR y purga de caché. Loader, versión global, Elementor/Yoast y JS excluidos.
- Backup: `/tmp/eo-content-marketing-before-20260831-162844.tar`.
- Hash Elementor conservado: `88df573273e33edb84cc67fffda3f86fd0f4168d1bbccea92be6726e8e7f5488`.
- Readback: CSS igual al paquete; seis documentos, SEO/thumbnail y menú sin cambios.
- Evidencia de paquete/baseline/readback: `tmp/content-marketing-mode-logo/` (scratch no durable).

## QA

Preview público local en 1440/878/390, tres modalidades por ancho: nueve estados, ambos SVG cargados,
proporción igual a su `viewBox`, sin compresión ni overflow del documento. SSR sin JS conserva alturas.
Se usa el viewBox real: `naturalWidth/naturalHeight` redondea el SVG a 300×70 y no es su relación exacta.
Capturas inspeccionadas de tablet/móvil; la tabla mantiene su desplazamiento interno previo en móvil.
Evidencia: `.captures/content-marketing/mode-logo-preview/` y `mode-logo/` para producción.
Readback y QA públicos PASS: nueve estados en tres anchos, ambos logos cargados y con alturas
esperadas; sin errores JS ni overflow de documento. Captura pública tablet inspeccionada.
Verificador SEO PASS; no se enviaron leads. QA advisory revisado y diff sin errores.

Rollback: con deriva revisada, restaurar sólo este CSS desde el TAR, purgar y volver a verificar.
La copia temporal del servidor puede caducar. No restaurar loader, JS, datos Elementor ni sitio completo.
Sin commit/push. No amplía la certificación de contraste, editor GUI, CWV ni conversiones reales.
