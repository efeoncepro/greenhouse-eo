# Carrusel Instagram · «¿Cómo llegamos hasta aquí?» — detrás de cámaras del comercial BREAKR (2026-10-22)

Carrusel orgánico de Instagram para @efeoncepro, marca agencia. Diez láminas 4:5 (1080 × 1350) en `laminas/`.
Portada con el clímax del anuncio (decisión del operador del 2026-10-22: el carrusel abre in medias res y rebobina).
Estado: **producido, en revisión del operador**. Nada programado ni publicado.

## Cómo se armó

- **Texto:** componentes del kit de video de La órbita **aprobado el 2026-10-17** (AXIS `efeonceGraphicLine.surfaces.audiovisual.videoKit`
  y recetas `video-*`; formato 4:5). Remate, remate con pregunta, burbujas de voz, subtítulo en vidrio y cierre con CTA.
  Marcado y hoja de estilos copiados del lienzo del anuncio («Componentes de video · v4»,
  https://claude.ai/artifact/Fy9wPUUKKnmE6arcNJkz4A, archivo `Componentes.dc.html`, sha256 2d2e63c2e5bd…) en `kit.css` y
  `close-inner.html`; animaciones en su estado final. Acento de la línea: teal, como el anuncio. Firma: logo oficial
  `public/branding/logo-negative.svg` y burbuja URL del kit. Ícono de deslizar: `swipe` de la iconografía Trazo
  (`resolveIcon`, `swipe.svg`).
- **Contraste:** todo texto va sobre el lecho navy o el vidrio del kit; ningún texto queda directo sobre la foto (las
  tomas, de día, no daban 4,5:1 en casi ninguna zona, medido).
- **Espacio para el lecho:** en 01, 05, 06, 08 y 09 las personas quedaban bajo el lecho. Se resolvió con
  `pnpm foto:expandir` (escala 0,82; 0,76 en la 06): el modelo sólo rellena el espacio nuevo de arriba y los lados y
  se vuelve a pegar el original. Salidas y logs en `expandir/`.
- **Grilla (03):** fondo oscuro de la videollamada extendido arriba (color muestreado de la toma) para que las burbujas
  no tapen caras.
- Reconstruir: `python3 slides.py && node shoot.mjs "$(pwd)"` (rutas absolutas dentro de los scripts).

## Láminas y fuentes (solo lectura; sha256, primeros 12)

| # | Texto | Fuente | sha256 |
|---|---|---|---|
| 01 | ¿Cómo llegamos hasta aquí? · Desliza para descubrirlo | `2026-10-17_breakr-marca/planos/final/00-gancho-congelado.png` | 7ae1344d39dd |
| 02 | Rebobinemos · ¿Y para cuándo estaría la campaña? | `…/planos/final/01-kickoff.png` | a97d24476ace |
| 03 | Seis semanas · Casting · Locación · Otra cotización | `2026-10-16_byteplus-anuncio-para-cuando/v2-gpt/plates-v5/03-grilla16.png` | f4586bcc96df |
| 04 | Día 42 | `…/v2-gpt/plates-v5/05-dia42.png` | dcbb1a332f66 |
| 05 | ¿Para ayer? · Ya está | `…/planos/final/09-ya-esta.png` | 5a803d42c5a4 |
| 06 | Nada de esto se filmó. · Así se hizo | `…/planos/final/10-lata.png` | db866de2cd45 |
| 07 | Antes de cualquier toma, el set | `…/v2-gpt/set/oficina-maestra.png` | e1401902d91e |
| 08 | La primera lata salió gigante · Una lata mide 15,7 cm… | `…/planos/11a-ola-llega-v3.png` | f040810674b3 |
| 09 | La IA acelera. ¿Y quién decide? · El criterio | `…/planos/final/17-lunes.png` | 75361e1209a5 |
| 10 | Síguenos · efeoncepro.com · logo | panel navy del kit | — |

Las tomas del anuncio son cuadros de storyboard (el video no se ha generado). `planos/final/` puede cambiar: si cambia,
este carrusel queda fijo con las huellas de arriba.
