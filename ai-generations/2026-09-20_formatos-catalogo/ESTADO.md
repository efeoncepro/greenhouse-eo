# Formatos del catálogo — estado al cierre, 2026-09-20

No se logró. El operador cerró la sesión: «la has cargado toda la sesión, me iré a otra».
Esto queda para que la próxima no repita el camino.

## Qué se produjo

- 34 planchas de cobertura (12 tomas × 3 formatos) en `rondas/cobertura/`, cada una con su
  `.prompt.txt` al lado. **Sirven como ronda de geometría, NO como entregable de marca.**
- 2 pilotos dirigidos en `rondas/piloto-dirigido/` — los únicos que miden dentro del canon.
- Gasto del día ≈ USD 5,0.

## Los tres errores que costaron el día, en orden de daño

1. **Reconstruí el oficio a pedazos en vez de cargar la skill.** No invoqué `design-studio` hasta
   el final. Su referencia `references/efeonce-photographic-language.md` tiene la barra de juicio,
   las palancas de impacto y los rangos medibles; nada de eso hacía falta deducirlo. Diagnóstico
   del operador: «estás perdiendo el impacto visual necesario por no leer bien las skills».
2. **Armé prompts a mano** con un compositor de carpeta en vez de `pnpm foto:prompt`. Resultado:
   se me cayó el `bloque-impacto-v1.txt` entero — el que pide luz con carácter, momento decisivo
   y tres planos. La sesión de fotografía midió **0 de 34 con planos de profundidad** contra 40%
   de la ronda aprobada. El canon dice textual: «NUNCA armes un prompt concatenando bloques a mano».
3. **Leí sólo `SCENE` y `FOREGROUND` de cada ficha** y tiré su prosa. Ahí vivían diez notas de
   «Fallos y fix» con el oficio ganado en rondas anteriores, y **el descarte de T10**: su propia
   ficha dice «Fallo de serie: es pintura… nosotros NO somos Berel». Pagué 3 planchas por eso.

## Lo que sí quedó probado (con medición)

- **Nombrar la materia elimina el objeto insertado.** El bloque §3.8.2 tiene dos huecos, `<TONO>`
  y `<materia de la escena>`; llenar el tono y borrar la materia obliga al modelo a inventar un
  panel liso. Misma toma, mismo tono oscuro, sólo cambia que la materia tenga nombre y razón:
  se arregla. **El tono nunca fue el problema** [corrección del operador].
- **Escribir la luz dentro de la escena sube el contraste de verdad**: T16 pasó de 45 a **70**
  (meta del canon 70–90); T1 con identidad dio **82**, por encima de la pieza aprobada (73).
- **Ninguna métrica de píxel detecta la losa** — planitud, canto y calma en L\* fallan las tres.
  La diferencia es semántica. El detector está en la entrada, no en la salida.
- **La banda superior del vertical resuelve la reserva mejor que la columna lateral del 16:9.**

## La regla que aprendí tarde y no está escrita en ningún canon

**La luz con carácter va sobre el SUJETO; la reserva vive en la sombra pareja que esa luz deja,
nunca en su camino.** Pedí la sombra gráfica de la ventana sobre el muro que *era* la reserva y
la rompí: el contraste bajó de 82 a 77 y la zona de texto de 0,24 a 0,22. La pieza aprobada
(`S1-panaderia`) ya lo resolvía: luz dura sobre el panadero, reserva en la sombra del muro.
Probablemente explica por qué toda la tanda salió plana: pedir «zona pareja» en cada toma empuja
al modelo a aplanar la escena entera.

## Para retomar

1. Cargar `design-studio` + su referencia del lenguaje fotográfico ANTES de tocar nada.
2. Usar `pnpm foto:prompt` con una ficha por toma. `--batch` >6 fichas exige piloto real en disco.
3. Mirar `ai-generations/2026-09-19_lenguaje-fotografico-efeonce/rondas/texto/` — es el estándar.
4. Medir con `scripts/metricas.cjs` de esa corrida (envoltorio: `impacto.mjs`): contraste 70–90,
   quemado ≤1%, sombras b\* −3 a +3 (cuatro de mis planchas salieron con sombras AZULES).
5. T10 fuera del catálogo. Las 5 tomas con identidad necesitan §3.6/§3.7 a mano: `foto:prompt`
   todavía no emite IDENTITY ni REFERENCES (hueco anotado por la sesión de fotografía).
