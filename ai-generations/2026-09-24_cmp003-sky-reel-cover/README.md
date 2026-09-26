# CMP-003 · Portada del reel «SKY nos eligió. De nuevo.»

Fecha: 2026-09-24. Estado: producida y revisada por agente; pendiente aprobación de esta portada por el operador. El operador declaró listo el video; esta pieza estática es una entrega separada. No publicada.

## Dirección

Titular Bricolage blanco de gran tamaño. «de nuevo.» es el gesto Guttery verde, inclinado y subrayado: segunda lectura sobre una relación que se amplía a SEO/AEO. Poppins explica «Ahora, también para SEO y AEO.». Degradado azul Efeonce a morado; los logos oficiales blancos y la URL Bubble completan la firma. El avión se reserva para el video.

El SKY del titular es texto en Bricolage; el logotipo oficial se utiliza en la firma inferior, con la separación de flecha/K aprobada para V17. No se reconstruyó el logo mediante tipografía ni generación.

## Skills y recursos aplicados

Publicidad (`efeonce-advertising-creative`), marca (`efeonce-brand-studio`), diseño (`design-studio`), social (`social-media-studio`), AXIS (`axis-design-system`), copy (`copywriting`), tipografía (`greenhouse-typography-accessibility`) y procedencia (`greenhouse-ai-creative-rights-governance`).

Recetas de @efeoncepro/axis-tokens: ideaImpact, ideaFocus, gesture y structureCopy. Workbench Creative Typography consultado en formato 9:16. SVG oficiales y fuentes existentes de campaña; rutas y hashes en manifest.json. No se realizó una nueva verificación documental de licencia de Guttery ni se entrega el archivo de fuente por separado.

## Producción y entrega

Composición local precisa en HTML/SVG, Playwright y Sharp. URL aplicada con compositeLuminosity del compositor canónico, opacidad 0,72, sobre el fondo real. Sin modelos generativos ni gasto de proveedor.

- PNG 2160×3840: master estático sRGB.
- PNG 1080×1920: entrega 9:16 sin compresión con pérdida.
- JPG 1080×1920: alternativa calidad 97, crominancia 4:4:4.
- render.mjs y cover.html: fuente de composición local. El HTML incorpora fuentes; se conserva en producción, no se copió al directorio de entrega.
- delivery.json: copias verificadas por SHA-256 en el canal de OneDrive; sincronización remota de OneDrive no verificada.
- alt.txt: texto alternativo.

Reproducir desde la raíz del repo:

```sh
node ai-generations/2026-09-24_cmp003-sky-reel-cover/render.mjs
node ai-generations/2026-09-24_cmp003-sky-reel-cover/qa.mjs
```

## QA

Inspección visual del PNG de entrega, preview a 390 px y recorte central 3:4. Es una prueba editorial de tolerancia al recorte, no una captura de Instagram ni certificación de su interfaz vigente. No se observó clipping de letras o logos. Revisadas jerarquía, flecha/K, firma y subordinación de URL.

Se compararon espaciados cerrado, equilibrado y abierto en el titular secundario. Seleccionado −0,025 em. Las tres fuentes cargaron correctamente. Contraste calculado sobre percentil 98 del fondo debajo de los píxeles de tinta: SKY 8,16:1; «nos eligió» 9,03:1; gesto 6,28:1; apoyo 11,46:1; logos 13,57:1 y 12,33:1. Ver qa/review.json. La URL tiene evidencia de mezcla y revisión visual; no se presenta como certificada en contraste.

No se modificó ni recodificó el video. No publicación, commit o push. La aprobación de la portada sigue pendiente.
