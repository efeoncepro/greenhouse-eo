# Retrato de Nexa para la landing `/agenda/` (2026-10-20)

Derivado del hero canónico de `/contacto/` (`2026-10-15_contacto-nexa-piel/contacto-nexa-hero-rostro-canonico-v3.png`),
sin generar a Nexa de nuevo. Encargo del operador: «Nexa debe estar más alejada»; el avatar de producto anterior quedaba
pegado a la cara y mostraba el isotipo del buzo.

| Archivo | Qué es | Estado |
|---|---|---|
| `inpaint/80d9daf8b20d/candidate-1.png` | Hero de contacto sin la línea de luz lima (`pnpm ai:inpaint erase --fill model`, Sunburst high, máscara por color restringida al fondo; zona protegida idéntica bit a bit; USD 0,041) | base |
| `nexa-retrato-agenda-720.jpg` | Recorte cuadrado 800 px (x 640, y 100) → 720 px para la pieza `portrait` (órbita alrededor de la foto) | en el canvas de la landing |

Notas: quedan restos tenues de la línea fuera del recorte (cola izquierda y punto a la derecha); el portátil queda en la
esquina que el círculo recorta, sin el logo. No reemplaza ni modifica el hero publicado de `/contacto/`.
