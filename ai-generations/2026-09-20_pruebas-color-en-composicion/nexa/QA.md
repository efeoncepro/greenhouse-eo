# Prueba 2 — Nexa · color en la composición

## Dirección y preflight

- Revisadas antes de generar: `rondas/personas/julio-nexa-firmadas.jpg`, `rondas/curado/set-curado-12.jpg`, `rondas/personas/N1-ojo-pez-final.png`, `rondas/personas/N2-reflejo-final.png` y la prueba previa `2026-09-20_pruebas-julio-nexa-codex/nexa/final-v3.png` (rutas completas en `ficha.json`).
- N1 aporta un gesto de decisión y tres planos; N2 aporta luz sobre vidrio, aunque su lima venía de un adhesivo. La prueba anterior puso el azul en un panel y el naranja en un equipo. Aquí Nexa alinea una experiencia proyectada: el azul cruza el ángulo arquitectónico y su terminación se vuelve lima. Ambos colores son luz de una sola obra, sin accesorios colocados para completar la paleta.
- El lecho es el borde de la consola de proyección que ella usa, realmente ante el lente. El logo oficial se compuso después del plate; no se pidió al modelo.

## Archivos

- `ficha.json`: intención y comparación visual.
- `prompt.txt`: salida exacta de `pnpm foto:prompt ficha.json`, sin concatenación manual.
- `plate.png`: imagen generada sin logo.
- `final.png`: plate con SVG oficial al 20 %.

## Verificación

- Motor devolvió 1122 × 1402, relación 4:5 nativa sin recorte.
- `pnpm foto:validar plate.png`: lecho blanco 9,71:1, navy 1,70:1; sombras b* −0,3. Las dos reservas evaluadas de cursores y campo profundo fallan (2/4 total); esta prueba no lleva cursores, titular ni objeto para selección. La revisión visual confirma una banda inferior oscura desenfocada sobre materia identificable.
- `metricas.cjs`: azul 7,50 %, lima 1,93 %, naranja 0,00 %, contraste 74, piel L/C 49/24, altas quemadas 0,00 %, sombras aplastadas 0,20 %. Los porcentajes corroboran visibilidad, no se usaron como cuota de diseño.
- `LOGO=0.20 .../componer.mjs plate.png final.png`: SVG blanco, contraste medido 17,67:1.

## Juicio visual

El azul y el lima forman la obra que Nexa revisa y se leen a tamaño de consumo. La piel y las sombras se mantienen neutras; identidad, pelo, cejas y rostro se sostienen frente a las referencias. El bloque de luz es deliberadamente gráfico: queda por validar con el operador si esta solución espacial le resulta natural dentro de la serie. Prueba, no pieza aprobada ni publicada.
