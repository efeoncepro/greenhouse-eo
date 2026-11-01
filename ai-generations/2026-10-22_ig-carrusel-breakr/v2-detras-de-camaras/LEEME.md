# Carrusel v2 · «¿Cómo llegamos hasta aquí?» — detrás de cámaras real (2026-10-22)

Reemplaza a la v1 (`../laminas/`), que contaba el comercial en vez de desarmar su producción (observación del operador).
Doce láminas 4:5 (1080 × 1350) en `laminas/`. Estado: **en revisión del operador**; nada programado.

| # | Qué muestra | Evidencia real |
|---|---|---|
| 01 | Portada: el clímax · «¿Cómo llegamos hasta aquí?» · desliza | `planos/final/00-gancho-congelado.png` ampliada con `foto:expandir` (ver `../expandir/`); el original se repuso con fundido de 12 px para borrar la costura (`insumos/s1-fundido.png`) |
| 02 | «Antes de cualquier imagen, 23 fichas» | Storyboard v4 del lienzo del anuncio (ficha 00 y 01); 23 tomas contadas en `TOMAS.json`. Se omitió el encabezado con presupuesto |
| 03 | «La bebida no existía: la creamos» | Lámina de marca BREAKR del lienzo del anuncio |
| 04 | «Antes de rodar, el casting» | Anclas: `2026-10-17_byteplus-retratos-elenco/antonio/` y `v2-gpt/casting/ancla-paula.png` |
| 05 | «Como en un rodaje, una planta» | Dibujada con los datos de `CONTINUIDAD.md` §1–§2 (mesa, posiciones, ventanal al este, ejes A/B/C, regla de 180°) |
| 06 | «Una lata real mide 15,7 cm» | `planos/11a-ola-llega-breakr-v1`, `-v3`, `-v6` (misma cámara) |
| 07 | «El contraplano cruzaba el eje» | `planos/11a-ola-llega-v6.png` (antes) y `planos/final/11a-ola-llega.png` (después) |
| 08 | «El golpe sobre Paula tomó 15 versiones» | 15 imágenes únicas por sha256 del plano 11b (`insumos/versiones.txt`, orden cronológico); duplicados excluidos |
| 09 | «La IA escribió «REAKR»» | `planos/10-lata-breakr-v1.png` vs `-v2.png` |
| 10 | «¿Con qué se hizo? Ingredientes»: video Seedance 2.5 (BytePlus) · imagen Seedream 5 (BytePlus) + GPT Image 2.5 (OpenAI) · audio ElevenLabs v4 · orquestador Claude Opus 5.5 | Cuadro a 2,5 s de `v2-gpt/pruebas/p1c-nativo-voz-seedance.mp4` · `planos/final/12-paredes.png` · forma de onda de `v2-gpt/pruebas/antonio-07-nativo-convertido.mp3` (firma C2PA de ElevenLabs en el archivo) · ficha del storyboard. Modelos verificados en los registros de la corrida: GPT Image 2.5 Sunburst/Flare fue el motor de imagen principal; el video sólo tiene pruebas, el final no se ha generado. Logos: `@efeoncepro/axis-brand-assets` (Claude, ElevenLabs, pasados a blanco; la chispa conserva #D97757), BytePlus del reel de partner, OpenAI de `2026-10-21_openai-partner/comp/` (`insumos/logos/`) |
| 11 | «La IA acelera. ¿Quién decide? El profesional» + «El que tiene el criterio.» | `planos/final/17-lunes.png` ampliada, con el mismo fundido (`insumos/s9-fundido.png`). Corrección del operador: el criterio no decide, decide el profesional |
| 12 | Cierre: Síguenos · efeoncepro.com · logo | panel del kit |

Texto: kit de video de La órbita aprobado el 2026-10-17 (mismo armado que la v1: `../kit.css`, `../close-inner.html`,
`../swipe.svg`). Imágenes del lienzo del anuncio descargadas con `Artifact read` (`https://claude.ai/artifact/Fy9wPUUKKnmE6arcNJkz4A`,
versión 1792674327-6081). Reconstruir: `python3 slides2.py && node shoot.mjs <carpeta de trabajo>` (rutas absolutas a la copia de trabajo del scratchpad). Pendiente antes de publicar: revisión de registros de marca de «BREAKR» (la lámina de marca del
anuncio lo exige antes de un uso público) y fecha de salida, que depende del comercial.

## v3 · sistema de impacto (2026-10-22, aprobado como piloto por el operador)

`laminas/` ahora tiene la v3; el piloto de tres láminas quedó en `piloto-impacto/`. Reglas del sistema: una imagen por lámina y
a sangre; el número como protagonista (23, 15,7 cm, 15); anotaciones de rodaje sobre el material real (recuadro de selección
teal con tiradores y etiqueta: «v3 · fuera de escala», «falta la B», «marca creada desde cero», «cada toma, especificada»);
fondo navy en vez de negro; Bricolage a 620. Reconstruir: `python3 sistema.py` (usa `piloto.py` y `slides2.py`) y
`node shoot-sistema.mjs <carpeta de trabajo>`. Pendiente: qué toma de Paula va en la 11 (pregunta abierta en el lienzo).

## Delta 2026-10-22 (tarde): 00 nuevo y video

- La sesión del anuncio avisó que Julio aprobó un 00 nuevo (`planos/final/00-gancho-congelado-v2.png`, sha256 0ba7dfc82f67;
  la lata queda frenada delante del pecho). Portada rehecha desde él (`foto:expandir` 0,82 + fundido, `../expandir/s1v2*`), y
  la hoja de contactos pasó a **16 versiones** (la 16 = 00 v2), en grilla 4×4. La claqueta dice «versión 16 de 16».
- Lámina 11 nueva, «El resultado»: video de 5 s (`laminas/breakr-bts-11-resultado.mp4`), hecho por la sesión del anuncio con
  Higgsfield + Seedance 2.5 (80 créditos), con el remate compuesto encima (`overlay.py`). Audio −21,5 LUFS, pico −4,7 dBFS,
  sin escuchar. Ojo: ese video termina con la física VIEJA (la lata sale volando hacia arriba), no con el 00 v2.
- «El profesional» pasó a ser la 12 y el cierre, la 13.
- Reemplazo: «El resultado» ahora usa el clímax APROBADO por Julio (`2026-10-17_breakr-marca/video/11a-11b/climax-aprobado-4x5.mp4`:
  POV de la lata → chapuzón → plano general con Paula empapada y la lata en la mesa; 5,1 s). Etiqueta «El clímax · video».
  Audio −18,1 LUFS, pico −0,7 dBFS (sin escuchar). El video anterior quedó en `descartes/`.
- «El profesional» (lámina 12) ahora usa el plano 17 nuevo aprobado por Julio (`planos/final/17-lunes-v2.png`, sha256 8cb414b7059a),
  coherente con el clímax nuevo; cabeza a ~24 % del alto, sin ampliar. El 17 anterior ya no se usa.
- Contraportada (lámina 13), opción A del operador: fondo = acabado aprobado del post del partnership
  (`2026-10-20_byteplus-partner/acabado-feed.png`), lockup «Ahora somos partners · Efeonce | BytePlus · Seedance · Seedream ·
  ModelArk» copiado de su `render-animacion.mjs`, y lecho navy con la pregunta, «Síguenos.» y @efeoncepro (usuario verificado
  en Metricool). Sin burbuja URL (no es clicable en Instagram) ni segundo logo (el lockup firma).
- Contraportada (lámina 13) REHECHA: el operador descartó reciclar el post del partnership y pidió «una contraportada más de
  diseño que sea uniforme para los cierres de carrusel». Es el cierre de marca del deck (AXIS `deckSlideHtml('close')`, B1)
  llevado a 4:5 con medidas de redes: órbita completa con esfera arriba y logo dentro, pregunta (Poppins 300 con anillo),
  respuesta «Síguenos.» (Bricolage 620 con su punto), @efeoncepro y eslogan «Empower your Growth». Plantilla reutilizable:
  `cierre_carrusel(question, answer, handle, line)` en `sistema.py`. Extensión de B1 al carrusel: aún no registrada en la
  línea gráfica (A4 dice que el carrusel no tiene regla aprobada).
- Contraportada ajustada (operador: «mejor cuando el ring y la órbita no completa»): un solo anillo al 20 % + arco de acento
  corto de 50° con la esfera en la punta, arriba a la izquierda, y halo suave (composition.md: el arco de acento es
  movimiento, no un dato). Se quitó el segundo anillo exterior (regla «un solo anillo alrededor del contenido»).
- Arco de acento subido a 200°–250° (operador: «que suba más la órbita»), igual que la portada del deck.
- CTA del cierre (operador): «¿Tu equipo está listo para escalar su producción creativa?» → «Compártelo.» (default de la plantilla); @efeoncepro queda como firma chica, no como segundo llamado.
- Cierre: se quitó @efeoncepro y va la burbuja URL efeoncepro.com del kit de video (el logo ya está en la órbita).
