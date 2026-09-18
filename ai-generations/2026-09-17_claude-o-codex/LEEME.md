# «¿Claude o Codex?» — pieza de estudio (2026-09-17)

Pedido del operador: él **detrás de una mesa, tipo estudio de podcast pero sin micrófono**, con Clawd y Codex, y el
titular **¿Claude o Codex?** más su línea entre comillas.

## Pieza

`out/claude-o-codex-4x5-v01.png` — 1152 × 1440 (4:5).
Plate: `plates/plate-v02.png`. Titular compuesto con `componer.mjs`.

```bash
node ai-generations/2026-09-17_claude-o-codex/componer.mjs [plate.png] [salida.png]
```

## Cómo se hizo

**Dos capas, como manda el contrato:** el modelo entrega **sólo el medio limpio** (foto sin una sola letra) y el
texto se **compone** con fontkit a trazos SVG desde las fuentes oficiales y las recetas de `axisAdvertising`:

- Titular `¿Claude o Codex?` — Bricolage Grotesque, receta `ideaImpact` (peso 780, ancho 96, óptico 88,
  tracking −0,035 em), `color.inkOnDark`, ajustado al 80 % del ancho **midiendo la tinta real**, no la métrica.
- Cita `“No sé cuál elegir”` — Poppins Medium, tracking de `structureTagline`, `color.softOnDark`, al 30 % del
  cuerpo del titular.
- Logo Efeonce en negativo, centrado abajo sobre la mesa.

**Ortografía:** el operador lo dictó como «No se cual elegir». Se compuso **con tildes** —«No sé cuál elegir»— porque
sin ellas es una falta en una pieza de marca. Las comillas y los signos de interrogación se respetaron tal cual.

## Reglas que se aplicaron

1. **Los ojos se declaran, no se dejan al azar.** La pieza anterior (`2026-09-17_julio-con-mascotas`) salió con los
   ojos extraños. Lo que lo corrige es un párrafo propio: ambos ojos idénticos en tamaño, forma y color, igual de
   abiertos, pupilas redondas apuntando al mismo punto, cristales sin reflejos ni aumento, el marco sin cortar la
   pupila, y brillos especulares en la misma posición en los dos.
2. **El espacio para el titular se pide como composición, no como «aire».** «Room to breathe above his head» devolvió
   60 px. Lo que funciona: «el TERCIO SUPERIOR ENTERO está vacío — sólo panel acústico desenfocado, sin cabeza, sin
   pelo, sin lámpara, sin brillo — la coronilla empieza debajo de ese tercio».
3. **Lo que NO debe aparecer se declara.** «Estudio de podcast sin micrófono» se escribió como «no mic, no boom arm,
   no pop filter, no headphones, no cables, nada sobre la mesa salvo las dos figuras»: nombrar el estudio arrastra el
   micrófono.
4. **Escala anclada a un objeto del cuadro:** cada figura mide lo que su cabeza de mentón a coronilla, y **apoya**
   sobre la mesa con sombra de contacto.
5. **Persona real, con su consentimiento.** Fotos entregadas por él mismo; `refs` en `2026-09-17_equipo-vestuario`.

## QA medido

Contraste sobre los píxeles reales del plate, contra el píxel **más claro** de cada zona:

| Zona | Blanco | `softOnDark` |
|---|---|---|
| Titular | 18,45:1 | 14,17:1 |
| Cita | 18,39:1 | 14,13:1 |
| Logo (sobre la mesa) | 10,67:1 | 8,19:1 |

Revisado además a 390 px de ancho: titular y cita siguen legibles. Mascotas verificadas al 100 % (cubos naranja con
ojos rectangulares; nube azul con `>_` cian en pantalla y blanco en el pecho) y el emblema del polo con la nave a la
derecha.

## Pendiente

Derivados 9:16 y 16:9 si la pieza se usa como portada. No está en OneDrive ni programada.
