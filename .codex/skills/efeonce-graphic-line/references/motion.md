# Movimiento de la órbita

> Verificado contra: axis-design-system@e26bd85 (íconos: AXIS `main@5b8ab20`, tag `v0.3.6`) y greenhouse-eo@051660d73
> — 2026-09-26 (decisiones del operador D7 y D8 del 2026-09-26 registradas; el motion de los íconos sigue pendiente
> tras D22). Identidad sonora recomendada revisada contra el PR AXIS #4 (squash `55486aa` en `main`, publicado) — 2026-09-26.
> Norma: `docs/operations/brand-graphic-line/EFEONCE_ORBIT_MOTION_LANGUAGE_V1.md`.
> Producción: `docs/operations/brand-graphic-line/EFEONCE_ORBIT_REVEAL_MOTION_V1.md` (v1.3).
> Valores: tokens `efeonceGraphicLine.motion` en `@efeoncepro/axis-tokens` ≥ 0.3.3 (la 0.3.2 salió sin `motion`).

## Dos familias distintas (no se mezclan)

| Familia | Qué es | Fuente | Duración |
|---|---|---|---|
| **La órbita sola** | anillo → arco → la esfera asienta → halo; sin logo ni eslogan | paquete `axis-graphic-line`: `ORBIT_MOTION_CSS`, `orbitMotionFrameCss(t)`, `<AxisOrbit animate>`, `<axis-orbit animate>`; tiempos del token `brandClose` | 2,0 s + 0,5 s de reposo |
| **Las animaciones del logo** (aprobadas V1.1) | reveal (la línea se vuelve logo), apertura (el logo se abre en la línea), sting (el golpe corto) | render Chromium de greenhouse-eo `scripts/creative/brand-motion/`; tiempos del token `motion.pieces` | 3,6 s · 2,4 s · 1,6 s |

La órbita sola se compone con cualquier firma o texto. Las animaciones del logo son piezas cerradas de marca propia:
nunca para clientes ni para la interfaz de Greenhouse.

**Íconos (Trazo y Plastilina): el movimiento no está definido.** La iconografía es canónica (D16–D22), pero su motion
figura como pendiente en AXIS (`docs/agent-composition/iconography.md`, «Pendiente de decisión»): necesita los tokens
`axisMotion` y esta norma. No hay tiempos, curvas ni coreografía aprobados —ni para el paso de reposo a respuesta ni para
la órbita sesgada—: no los inventes. Una propuesta va al operador y, si se aprueba, sus valores entran a los tokens y a
esta referencia ([iconography.md](iconography.md)).

## Las siete reglas (resumen operativo; el detalle y el porqué están en la norma)

1. **Lento → rápido → lento.** Pausa o anticipación antes de arrancar (la nave retrocede 3,5 % antes de salir);
   un protagonista a la vez; relevo arco → giro → nave → cámara → letras.
2. **Llegar con golpe.** Sobrepaso por papel (`motion.overshoot`: nave 0,9 · esfera al nacer 2 · letras 1,6 · por
   defecto 1,2); pulso de impacto con eco al 55 % (`motion.pulse`); el isotipo crece 4,5 % con el golpe
   (`motion.impactScale`); onda de acento 1,02 → 1,5 al encajar (`motion.wave`); resorte casi crítico, ≤ 1,5 %
   (`motion.settle`).
   El eco del pulso de impacto es el único uso del **anillo propio de la esfera** (`sphereRing`) en movimiento: está
   reservado a «en vivo» (D8, 2026-09-26). No se usa como adorno en el cuadro final.
3. **Curvas por papel** (`motion.curves`): llega = `emphasized`; se transforma = `standard`; se va =
   `emphasizedAccelerate` (valores en `axisMotion.ease`).
4. **La velocidad no salta en los relevos**; zoom de cámara en escala logarítmica (`motion.cameraZoom: 'log'`).
5. **Movimiento real:** desenfoque sólo en los tramos rápidos (`motion.pieces.*.blurMs`), obturador de 180° con
   5 subcuadros (3 en vistas previas); color mezclado en OKLab (`motion.colorMix`).
6. **La marca manda en la geometría:** archivos oficiales, oclusión 3D coherente, la esfera protagonista, letras
   que nacen detrás del isotipo (28 ms de escalonamiento, 420 ms cada una), jerarquía (`motion.layout`): anillo
   héroe 78/80/84 % del lado corto (16:9 / cuadrado / vertical), logo final 50/56/66 %, eslogan 64 % del logo.
7. **Sonido en el golpe:** sintetizado y determinístico, un golpe por impacto, paso de la nave paneado, acorde
   final con fundido de 0,45 s; pico −1 dBFS, ~−17,5 LUFS, WAV 48 kHz / 24 bits (`motion.sound`).

**Halo sobre fondo claro:** a media intensidad. El render del motion lee el mismo token que el contrato,
`efeonceGraphicLine.orbit.haloOnLightScale` (0,5; axis-tokens 0.3.5; D7). Nunca un factor escrito en el
script.

## Sonido: la identidad sonora (recomendada)

- **Lo vigente:** los masters V1.1 del bucket (`motion/logo/v1.1/`) siguen con el sonido de la regla 7
  (`scripts/creative/brand-motion/orbit-sound.mjs`, `motion.sound`). No los reemplaces a mano.
- **La identidad sonora recomendada** (2026-09-26, **no canon**) re-sonoriza reveal, apertura y sting **sin tocar la
  imagen**: la esfera sonora cae con el golpe de encaje (sting 0,58 s · reveal 1,87 s · apertura 1,15 s); el reveal
  con voz extiende 1 s el cuadro final para oír la cola. Vive en AXIS `https://axis.efeonce.org/references/sonic-brand/`
  (publicada; PR AXIS #4) y en el bucket `sonic/v1/`. Detalle: skill `audio-studio`
  (`efeonce/EFEONCE_OVERLAY.md` §Identidad sonora).
- **Al canonizar:** sus valores entran a los tokens junto a `efeonceGraphicLine.motion.sound` y se reemplaza el sonido
  de los masters V1.1 (hoy el kit `sonic/v1/masters/03-motion` trae sus propios WAV+MP4 16:9/9:16).

## Entregables y dónde están

- **Por pieza × formato × fondo** (30 variantes: reveal/apertura/sting × 16:9, 16:9 4K, 1:1, 4:5, 9:16 × navy/claro):
  MP4 60 y 30 fps con sonido; ProRes 4444 con alfa (editores); WebM con alfa (web, Chrome/Firefox); HEVC con alfa
  (Safari, Keynote); GIF de vista previa (16:9 y 1:1); cuadro final con fondo y transparente; secuencias PNG por
  capas (principal sin halo, halo, combinada). El alfa es directo, sRGB; los masters transparentes no llevan audio.
- **Bucket público de AXIS** (fuente de los masters): `gs://efeonce-group-axis-public-media/motion/logo/v1.1/<reveal|apertura|sting>/<formato>/<navy|claro>/`,
  servido en `https://storage.googleapis.com/efeonce-group-axis-public-media/…`. Nunca en git.
- **OneDrive** `Alineación/5. Contenidos/13- Branding/Motion Órbita Efeonce/v1.1/`: MP4, GIF, cuadros finales y
  `LEEME.txt` (sin ProRes ni capas: están en el bucket).
- **Lab** 4.4.2 «Animaciones de marca» (`https://axis.efeonce.org/references/graphic-line/#animaciones`): versiones web
  livianas, fichas y la galería «Todas las versiones terminadas» que reproduce desde el bucket. La lista vive en
  `FINISHED_VARIANTS` de `apps/lab/src/pages/references/graphic-line.astro` (agregar una variante = una línea + su
  póster WebP en `apps/lab/public/media/graphic-line/motion/posters/`).

## Cómo se produce (greenhouse-eo)

```bash
# Cuadros de una variante (60 fps, 5 subcuadros en tramos rápidos)
node scripts/creative/brand-motion/render-orbit-motion.mjs --out <run>/frames --anim reveal --format 16x9 --scheme dark --fps 60
# Storyboard de cuadros clave (para revisar o comparar después de cambiar algo)
node scripts/creative/brand-motion/render-orbit-motion.mjs --out <run>/storyboard --anim reveal,open,sting --storyboard
# Sonido y codificación
node scripts/creative/brand-motion/orbit-sound.mjs --anim reveal --out <run>/sound/reveal.wav
node scripts/creative/brand-motion/encode-orbit-motion.mjs --frames <run>/frames --sound <run>/sound --out <run>/deliverables
```

Cola de 30 variantes: `ai-generations/2026-09-26_orbita-motion/run-all.sh` (tres workers, candado de una sola
instancia, marcas `.done`/`.encoded`, `< /dev/null` en node). Cierre: `finalize.sh` sube todo al bucket, copia lo
liviano a OneDrive, verifica archivo por archivo y sólo entonces borra `frames/` y `deliverables/`. `chain.sh` espera un
cierre, marca lo ya subido y relanza.

**La órbita sola en video (AXIS):** `pnpm orbit:video -- --format 16x9 --surface dark --out <dir>` (formatos 16x9, 1x1,
4x5, 9x16; fondos dark/light) exporta MP4 y cuadro final cuadro a cuadro desde el paquete.

## Cambiar un valor del movimiento

1. Cambiar el valor en `efeonceGraphicLine.motion` (AXIS `packages/tokens/src/tokens.ts`) con su razón y ajustar
   `tokens.test.ts`.
2. Publicar `axis-tokens` (etiqueta nueva; revisar antes que nadie haya tomado ese número de versión).
3. Fijar la versión en greenhouse-eo (credencial efímera) y renderizar el storyboard.
4. Comparar con el storyboard anterior. Si una pieza aprobada cambia, necesita la aprobación del operador antes de
   producir masters.

## Qué no hacer

- Generar estas animaciones con un modelo de video.
- Escribir tiempos, sobrepasos o proporciones en un script: se leen del token.
- Mover dos protagonistas a la vez, frenar sin golpe o usar la onda o el pulso como adorno sin un encaje.
- Poner esfera o mayúsculas en el eslogan; usar las animaciones del logo para clientes o UI de Greenhouse.
