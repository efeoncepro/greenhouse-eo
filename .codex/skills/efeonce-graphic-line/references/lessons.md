# Lecciones (trampas que ya costaron tiempo)

> Cada entrada: fecha, síntoma, causa y la regla que la evita. Es la parte más valiosa de la skill: se agrega en el
> momento, no al cierre.

## 2026-09-26

- **Las recetas se alejaron del canvas en silencio.** Síntoma: lente con disco gigante, foco sin anillo, firma con el
  arco a la derecha, deck con el texto en otro lugar. Causa: se derivaba cada pieza de una sola escala, pero el canvas
  ajustó cada pieza a mano. Regla: las piezas de formato fijo se **miden** del canvas (`efeonceGraphicLine.pieces`,
  `portrait`) y la receta las reproduce; cada una tiene una prueba contra su pieza original. Antes de publicar una
  receta, compararla con su lámina (posición, trazos, opacidad, grados del arco, esfera, texto y logo).
- **IDs duplicados de SVG.** Síntoma: en el storyboard del foco, la luz de todos los cuadros quedaba en la posición del
  primero. Causa: cada cuadro repetía `id="…-mask"` y el navegador resuelve `url(#id)` al primero del documento.
  Regla: prefijo por defecto = hash del contenido; piezas idénticas en una misma página llevan su propio `idPrefix`
  (`<AxisOrbit>` usa `useId`). La e2e del Lab exige cero ids duplicados.
- **La cola de render se saltaba variantes sin avisar.** Causa: `node`/`ffmpeg` leen stdin dentro de
  `while read … < queue.txt` y se comen líneas. Regla: `< /dev/null` en todo comando dentro de un `while read`.
- **Dos colas en paralelo corrompieron 4 MP4.** Regla: candado de una sola instancia (`mkdir .lock`) y marcas
  `.done`/`.encoded`; nunca relanzar una cola sin revisar `pgrep`.
- **Un cierre que borra carpetas choca con una cola que escribe en ellas.** Regla: `chain.sh` espera al cierre antes
  de relanzar; el cierre sólo borra después de verificar archivo por archivo en el bucket.
- **Etiqueta tomada por otra sesión.** `v0.3.2` quedó en el commit anterior y `axis-tokens` 0.3.2 salió sin `motion`.
  Regla: antes de etiquetar, `git ls-remote --tags origin` y confirmar que el commit de la etiqueta contiene el cambio
  (`git merge-base --is-ancestor`); coordinar con las sesiones activas.
- **El Lab no compila con un export nuevo de otra sesión.** Síntoma: `MISSING_EXPORT` en el build del Lab. Regla:
  `pnpm build` en la raíz de AXIS (compila los paquetes) antes de construir el Lab.
- **El clasificador de permisos bloquea publicar y crear infraestructura pública** (etiquetas de release, buckets
  públicos). Regla: pedir la autorización explícita del operador al comienzo, no al final.
- **Instalar AXIS en local da 401.** Regla: credencial `read:packages` efímera con `NPM_CONFIG_USERCONFIG` apuntando a
  un archivo 600 que se borra al terminar; nunca imprimirla ni commitearla.
- **Comentario de código desactualizado citado como regla** («logo al 46 % / 58 %»). Regla: los números salen del
  código o del token, nunca de un comentario.
- **Refactor del motor sin romper lo aprobado.** Regla: renderizar el storyboard antes y después y comparar byte a
  byte (90 cuadros + 3 sonidos idénticos el 2026-09-26).
- **ffmpeg local sin libwebp.** Regla: los pósters WebP se hacen con `sharp`.
- **El panel del navegador no reproduce video de archivos locales** (muestra una instantánea). Regla: mostrar video
  desde el Lab o desde una URL, no desde un HTML local.
- **La e2e «creative typography reference» cae por tiempo con render en paralelo.** No es regresión: correrla sola.

- **Documentar el método leyendo el maestro, no de memoria (íconos, 2026-09-26).** Síntoma: un agente sin contexto
  siguió la receta de Plastilina y pintó el gesto en el acento. Causa: la receta decía «acento en la esfera y el gesto»,
  pero el maestro `IconoE` lo pinta en tinta; y la geometría vivía sólo en el canvas. Regla: toda receta se contrasta
  contra el código del maestro antes de publicarse, la geometría canónica vive en código versionado (hoy AXIS: `@efeoncepro/axis-graphic-line/icons`), y
  un método nuevo se prueba con un subagente sin contexto antes de darlo por documentado.

## Derivas conocidas entre docs y código (abiertas, 2026-09-26)

- `paintGraphicLine` (AXIS) no pinta `voice`, `url-bubble`, `slogan`, `state`, `logo-inline` ni `brand-close`: esos
  elementos los materializa quien consume (texto, `answerHtml`, `stateMarkerSvg`, archivos de brand-assets).
- El adapter de Greenhouse no pinta `spotlight` ni `family-map` (la capa `graphic_line` de `creative:layout` los acepta y
  los omite sin aviso), no pinta la marca de partida de una medida y su SVG no lleva `focusable="false"`.
- En AXIS, la guía de agentes todavía dice que se rechaza la burbuja como firma fuera de Efeonce (ese código ya no
  existe) y los ejemplos `deck-progress-manifest.json` y `report-measure-manifest.json` son de la 0.2.0 (arco que se
  llena). Un comentario de `measureSvg` dice que a 0 % queda el anillo solo; el código pone la esfera en la partida.
- El eslogan usa `#848484` en `src/config/efeonce-brand.ts` y en el render del motion (3,51:1 sobre papel); el token
  claro es `#6b6b6b` (5:1).
- `sphereDividerSvg` usa por defecto una esfera de 6 px; la firma de correo pide 9 px (`emailSignature`).
- `urlBubble.assets` guarda nombres heredados (`url-lum-*.svg`) que no existen en brand-assets.
- No existen: Lottie, un componente HTML de firma de correo, un pintor del `area-mark` de la firma de equipo, un archivo
  del eslogan ni el logo de Greenhouse en brand-assets. No los inventes; proponlos.

Regla: al tocar cualquiera de estos puntos, corregir la fuente (código o doc), borrar la línea de aquí y anotarlo en el
registro.
