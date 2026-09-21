# La prenda PUESTA es el asset de uso (2026-09-21)

Cuatro intentos de vestir a alguien con la gorra fallaron pasando al modelo la **prenda aislada** —el render
sobre fondo transparente— como referencia. Ese es el asset de **producción**: sirve para construir vistas del
kit, no para usar la pieza en una escena.

**El asset de uso es la prenda PUESTA.** Los kits ya la traen y no se estaba usando:

- gorra: `ai-generations/2026-09-17_gorra-efeonce/out/prueba-nexa.png` · `prueba-julio.png`
- polo: `ai-generations/2026-09-17_polo-efeonce/out/navy-13-puesto-frente` y `navy-15-puesto-frente-cuerpo-b`

Su LEEME ya decía de esas pruebas que «el logotipo se mantiene legible y el emblema conserva su orientación».

**Resultado con el cambio, a la primera:** el logotipo completo «efeonce» sale legible y bien colocado en la
gorra, y el isotipo del polo conserva tamaño y posición. Es la primera pasada de la jornada en que la marca sale
bien, después de tres teorías equivocadas —que el modelo no sostiene letras a esa escala, que había producido
una variante real, que la versión transparente estaba dañada— y ninguna requería teoría.

**La regla:** arte plano → producir vistas · prenda aislada → construir · **prenda PUESTA → usar en escena**.
Hallazgo paralelo de la sesión peer en el kit del lanyard, mismo día.

Instrucción que acompaña a la referencia: «Image 3 shows this same person ALREADY WEARING the exact uniform for
this scene. Copy that uniform EXACTLY as it appears there… Ignore the office background of image 3 entirely;
only the garments and how they sit on her carry over.»
