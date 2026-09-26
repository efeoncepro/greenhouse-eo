# Línea gráfica Efeonce — Reveal y apertura de la órbita (motion)

> **Tipo de documento:** Especificación de producción de motion
> **Versión:** 1.2
> **Creado:** 2026-09-26 por Claude
> **Última actualización:** 2026-09-26 por Claude (ruta exacta en OneDrive y la animación de la órbita sin logo desde el paquete de AXIS)
> **Estado:** V1.1 aprobada por el operador (2026-09-26): más punch y sting de 1,6 s; tiempos aún en el script (pendiente pasarlos a tokens `brandReveal` / `brandOpen` de AXIS)
> **Documentación técnica:** [Manual de la línea gráfica](./EFEONCE_GRAPHIC_LINE_V1.md) · [ADR](../../architecture/EFEONCE_GRAPHIC_LINE_ORBIT_DECISION_V1.md)

## 1. Qué son y cómo conviven

Son dos piezas de marca que conviven con el cierre anterior (anillo, arco y eslogan) y no lo reemplazan:

| Pieza | Recorrido | Duración | Uso |
|---|---|---|---|
| **Reveal** | línea → logo | 3,6 s | Firma de cierre de video, apertura de presentación o intro de evento |
| **Apertura** | logo → línea | 2,4 s | Paso del logo al lenguaje de la línea: el logo «se abre» y deja el anillo con su arco listo para componer |
| **Sting** | el golpe corto | 1,6 s | Cortinillas, redes y cierres breves: el isotipo ya formado, la nave encaja de un golpe y la cámara salta al logotipo |
| Cierre anterior | anillo + eslogan | — | Sigue vigente (`motion-design-studio`, overlay Efeonce) |
| Órbita sola | anillo → arco → esfera → halo, sin logo | tiempos de `brandClose` | Sale del paquete `@efeoncepro/axis-graphic-line` (`ORBIT_MOTION_*`); a video con `pnpm orbit:video` en el repo de AXIS |

**Idea.** El anillo fino de la línea gráfica es la órbita del isotipo vista de frente. Al inclinarse hacia el ángulo
del isotipo, el anillo toma el grosor oficial y la esfera se convierte en el planeta. Luego la nave entra volando por
la izquierda, la cámara se acerca a la «o» del wordmark y las letras salen de detrás del isotipo. La apertura recorre
el mismo camino al revés: las letras se recogen, la cámara vuelve, la nave sale por la derecha y el anillo se endereza
hasta quedar de frente, con el arco dibujándose.

## 2. Geometría (todo medido de los archivos oficiales)

Las piezas salen del isotipo oficial de `@efeoncepro/axis-brand-assets` (`efeonce-isotype-negative`), sin redibujar
nada. Las medidas se calculan en tiempo de ejecución, no se escriben a mano:

- **Elipse de la órbita:** ajuste por mínimos cuadrados a la línea media del anillo (semiejes `a`/`b`, inclinación ≈ 0°).
- **Inclinación:** giro sobre el eje mayor. `A = a` fijo y `B = a·cos(g·acos(b/a))`, con `g` de 0 (círculo) a 1 (elipse oficial).
- **Grosor:** perfil interior/exterior por ángulo, ajustado con una serie de Fourier de orden 4 con descarte
  iterativo de valores atípicos (2,2 σ). Pasa de trazo fino (el de la línea) al perfil oficial.
- **Aire oficial:** la separación nave–anillo y planeta–anillo (~13 unidades del isotipo) se mide y se respeta en cada cuadro.
- **Logo:** contiene el mismo isotipo a escala 0,33576. La cámara lleva el isotipo héroe exactamente a esa posición.

## 3. Oclusión (qué pasa por delante y por detrás)

- El anillo cerrado se construye con las tres piezas oficiales del anillo más un cierre morfológico de radio
  `cruce/2 + 2`, lo justo para unir los cruces sin rellenar los bordes interiores.
- **Sectores delantero y trasero:** se asignan por ángulo según qué pieza oficial es dueña de ese tramo.
- El **anillo trasero** se abre alrededor del planeta y de la silueta de la nave (dilatada por el aire oficial), en movimiento.
- El **casco** se corta con el anillo delantero dilatado por el aire, salvo en las zonas de cruce, donde manda la nave.
- La **aleta de cola** viaja con la nave y no se corta.
- **La nave vuela siempre sobre el anillo continuo del giro**, que también se abre a su alrededor (sector trasero y
  zonas de cruce). El anillo oficial cerrado trae los escalones de sus cruces (la pieza delantera es más baja y gruesa
  que la trasera), y esos escalones sólo quedan ocultos con la nave en su lugar: por eso entra **de golpe** a los
  2250 ms, cuando la nave ya los tapa. Un fundido entre dos anillos casi iguales deja un contorno fantasma.
- Luego la construcción se reemplaza por el **isotipo oficial completo** (2300–2400 ms). La diferencia medida
  entre ambos es de 183 px sobre el cuadro completo: invisible y resuelta por el cruce.
- **No** se usa apertura morfológica para limpiar el casco: `feMorphology` tiene núcleo cuadrado y corta la punta de
  la nave en ángulo recto y encuadra las ventanas.

## 4. Tiempos

### Delta V1.1 — más punch (aprobado 2026-09-26)

Las tablas de abajo son la V1 (4,2 s y 2,8 s) y quedan como referencia del recorrido. La versión aprobada es la V1.1,
con **reveal 3,6 s, apertura 2,4 s y sting 1,6 s**, y su fuente de verdad son `stateReveal`, `stateOpen` y
`stateSting` de `scripts/creative/brand-motion/orbit-scene.js` (y `DURATION` / `BLUR` de `render-orbit-motion.mjs`)
hasta que existan los tokens de AXIS. Qué cambió:

- **Ritmo lento–rápido–lento:** cada acción arranca después de una pausa corta (anticipación) y se resuelve con un
  golpe; la nave entra rápido, se pasa un poco y vuelve (`backOut`) y el isotipo encaja con un pulso de impacto.
- **Onda de acento:** al encajar (o lanzarse en la apertura) la órbita en acento se expande y se desvanece.
- **Sting:** el isotipo ya formado; la nave encaja de un golpe con la onda y la cámara salta al logotipo.
- **Eslogan al 64 % del logotipo** para que no compita con el logo (decisión del operador).
- **Desenfoque de movimiento** en reveal 1250–1900 y 2050–2750 ms, apertura 350–950 y 1150–1550 ms, sting 100–600
  y 720–1250 ms.
- **Sonido con impactos:** los golpes de llegada acompañan cada encaje; pico −1 dBFS.

Curvas AXIS: `emphasized` (0.2, 0, 0, 1), `standard` (0.4, 0, 0.2, 1) y `emphasizedAccelerate` (0.3, 0, 0.8, 0.15).
Asentamiento con resorte (amortiguación 0,82, ω 11). El color se mezcla en OKLab y la escala de cámara se interpola
en espacio logarítmico, para que el acercamiento se sienta constante.

### Reveal (4,2 s)

| Tramo | ms | Curva |
|---|---|---|
| El anillo aparece (con respiración 0,96 → 1) | 0–450 | emphasized |
| El arco se dibuja con la esfera | 250–1150 | standard |
| Halo sube | 1200–2200 | standard |
| Inclinación | 950–1850 | standard |
| Grosor oficial | 1050–1850 | standard |
| Color de línea → color del logo | 1050–1750 | standard |
| La esfera se vuelve planeta (asienta 1700–2100) | 1450–1850 | standard + resorte |
| Se abre el aire del planeta | 1500–1850 | emphasized |
| Nave entra por la izquierda (sobre el anillo del giro) | 1550–2250 | emphasized |
| Relevo al anillo oficial cerrado | 2250 | instantáneo |
| Isotipo asienta | 2250–2450 | resorte |
| Cambio a isotipo oficial | 2300–2400 | lineal |
| Cámara a la «o» + halo baja | 2450–3250 | standard |
| Letras (escalonadas 30 ms, 520 ms cada una) | desde 2750 | emphasized |
| Eslogan | 3100–3600 | emphasized |
| Cuadro final fijo | 3600–4200 | — |

### Apertura (2,8 s)

| Tramo | ms | Curva |
|---|---|---|
| Letras se recogen | 300–800 | emphasized |
| Isotipo oficial → anillo cerrado → anillo continuo | 1000–1080 · 1085 | lineal · instantáneo |
| Cámara vuelve al isotipo héroe + halo | 600–1300 | standard |
| Nave sale por la derecha, acelerando | 1100–1700 | emphasizedAccelerate |
| Se cierra el aire del planeta | 1400–1700 | emphasizedAccelerate |
| El anillo se endereza, afina y toma el color de línea | 1400–2200 | standard |
| El arco se abre y el anillo respira a 1,18 | 2000–2800 | emphasized |

**Desenfoque de movimiento real** en los tramos rápidos (reveal 1550–2250 y 2450–3250; apertura 600–1300 y
1100–1700): cada cuadro promedia 5 subcuadros en un obturador de 180°, en alfa premultiplicado, para que los
bordes no se ensucien.

## 5. Sonido

Sintetizado en código (`orbit-sound.mjs`): determinístico, sin muestras ni modelos de terceros, y sutil por diseño.
Aire de la línea, un hilo tonal que sube con el arco, la subida de quinta del giro, la campanilla del planeta, el paso
de aire de la nave (paneado con su recorrido), un golpe grave de llegada y un acorde abierto de resolución (La).
Formato WAV de 48 kHz y 24 bits. Medido: reveal −17,7 LUFS con pico de −3,0 dBFS; apertura −17,5 LUFS con pico de −2,2 dBFS.
En la entrega va mezclado en los MP4, con fundido final de 0,45 s.

## 6. Entregables

Por cada pieza, formato (16:9 1920×1080, 16:9 4K 3840×2160, 1:1 1080, 4:5 1080×1350, 9:16 1080×1920) y fondo
(navy `efeonceGraphicLine.color.dark` o claro `paper`):

| Archivo | Para qué |
|---|---|
| `…_60fps.mp4` y `…_30fps.mp4` | Con fondo y sonido (H.264, yuv420p, BT.709) |
| `…_alpha-para-fondo-{oscuro\|claro}_prores4444.mov` | **Master transparente** para After Effects, Premiere, Final Cut o DaVinci |
| `…_alpha-para-fondo-{oscuro\|claro}.webm` | Transparente para web (VP9 con alfa; Chrome y Firefox) |
| `…_alpha-para-fondo-{oscuro\|claro}_hevc.mov` | Transparente para Safari, Keynote y dispositivos Apple |
| `…_960.gif` | Vista previa (sólo 16:9 y 1:1) |
| `png-por-capas/` | Secuencias PNG: `principal` (sin halo), `halo` y `combinada` |
| `…_cuadro-final.png` | Último cuadro, con fondo y transparente |

El alfa es directo (no premultiplicado) y sRGB. La versión «para fondo oscuro» lleva el logo en blanco; la «para
fondo claro», en navy. El halo va como capa aparte para poder bajarlo o quitarlo.

Destino para el equipo: OneDrive `Alineación/5. Contenidos/13- Branding/Motion Órbita Efeonce/v1.1/` (MP4 con sonido
a 60 y 30 fps, GIF de vista previa y cuadro final con fondo y transparente, por animación, formato y fondo; con un
`LEEME.txt`). Los masters pesados se sirven desde el bucket público de AXIS (abajo) y se archivan en GCS con
`pnpm media:archive-ai-generation`. Nunca en git.

**En el Lab de AXIS** (4.4.2 «Animaciones de marca», axis.efeonce.org) van versiones web livianas —MP4 H.264 de
1280 px a 30 fps con sonido, 100–170 KB, y el cuadro final en WebP como póster— de reveal (16:9 y 1:1), apertura
(16:9 navy y claro) y sting (16:9 y 4:5 claro), con una ficha por animación. Los masters descargables (MP4, ProRes 4444,
WebM y HEVC con alfa) se sirven desde el bucket público de AXIS `gs://efeonce-group-axis-public-media` (creado el
2026-09-26 con autorización del operador; lectura pública, CORS para el Lab) en `motion/logo/v1.1/<anim>/<formato>/<fondo>/`,
con `gcloud storage rsync` desde `deliverables/` (sin las secuencias por capas). Nunca en git.

## 7. Cómo se produce

```bash
# Cuadros (una variante) — transparentes + con fondo, 60 fps
node scripts/creative/brand-motion/render-orbit-motion.mjs --out <run>/frames --anim reveal --format 16x9 --scheme dark --fps 60
# Storyboard de cuadros clave
node scripts/creative/brand-motion/render-orbit-motion.mjs --out <run>/storyboard --anim reveal,open --storyboard
# Sonido
node scripts/creative/brand-motion/orbit-sound.mjs --anim reveal --out <run>/sound/reveal.wav
# Codificación de entregables
node scripts/creative/brand-motion/encode-orbit-motion.mjs --frames <run>/frames --sound <run>/sound --out <run>/deliverables
```

Render en Chromium (Playwright) con supermuestreo ×2 (×1 en 4K), dos pasadas por cuadro (principal y halo) con
transparencia real. Todo sale de los archivos oficiales, los tokens `efeonceGraphicLine` y las curvas `axisMotion.ease`.
La producción de V1 corrió en `ai-generations/2026-09-26_orbita-motion/`.

## 8. QA antes de entregar

- [ ] El cuadro final coincide con el logo oficial (comparación de píxeles; sólo antialias).
- [ ] Ningún cuadro muestra el logo recoloreado ni deformado; el isotipo oficial manda desde 2400 ms.
- [ ] La velocidad no salta en los relevos (arco → giro → nave → cámara).
- [ ] Sin parpadeo del trazo fino en los primeros cuadros.
- [ ] El alfa se ve limpio sobre negro, blanco y cuadriculado.
- [ ] Los archivos abren en su aplicación de destino (ProRes en un editor, WebM en Chrome, HEVC en Safari o Keynote).

## 9. Qué no hacer

- No generar esta animación con un modelo de video: el logo no se sostiene y la oclusión no es exacta.
- No transcribir los tiempos a otro script: se leen de aquí hasta que existan los tokens `brandReveal` / `brandOpen`.
- No usar el reveal para marcas cliente ni para UI de Greenhouse: es marca propia de Efeonce.
- No poner el eslogan en mayúsculas ni con esfera (manual §5).

## 10. Pendiente

- Terminar las 30 variantes de la cola V1.1 (`ai-generations/2026-09-26_orbita-motion/run-all.sh`, con candado de una
  sola instancia desde el 2026-09-26: dos instancias en paralelo corrompieron cuatro MP4, recodificados desde sus
  cuadros), entregarlas en OneDrive y archivarlas en GCS.

- Pasar tiempos y curvas a tokens de AXIS (`efeonceGraphicLine.brandReveal` / `brandOpen`) y una demo viva en el Lab.
- Variantes para Globe, Wave y Reach (acento y palabra del eslogan desde `family`).
