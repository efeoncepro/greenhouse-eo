# Reference-Chaining (continuidad entre tomas)

> **Estado:** validado — 2026-07-05 (prueba de referencia, spot AEO).
> **Evidencia:** `omni_ref_test.mp4` (salió casi idéntico al frame de origen).

## La idea en una frase

Tomas text-to-video **independientes** se ven como **escenas sueltas** (fue el problema del primer rough
cut del estadio). Solución: **cada toma usa el ÚLTIMO frame de la anterior como `inlineData` de referencia**
+ el prompt del beat siguiente → mundo, luz, composición y estilo **consistentes**.

## Cuándo usarla

- Un spot/secuencia con **varias tomas IA** que deben sentirse del **mismo mundo**.
- Cuando la consistencia de escena/personaje importa y no quieres que el modelo "reinvente" cada toma.

## Pasos (encadenados)

1. Genera la **toma 1** (text-to-video o desde keyframe).
2. Extrae su **último frame** (`ffmpeg -sseof -1 -frames:v 1 ...`).
3. Genera la **toma 2** pasando ese frame como `inlineData image/png` + el prompt del **beat 2**
   ("continúa esta escena: ahora la cámara…").
4. Repite (frame N → toma N+1). Verificado: la referencia devuelve una toma **casi idéntica** en
   mundo/luz/composición.

## Qué NO hacer / gotchas

- ❌ Encadenar sin dirección: si el prompt del beat siguiente contradice la referencia, deriva.
- ❌ Esperar consistencia perfecta de **texto/logo** (eso NO; van por overlay real — ver la regla transversal).
- Alternativa a futuro: **edición conversacional multi-turn** de Omni (pasar la toma previa como contexto de
  la misma conversación) — a probar y documentar acá.

## Costo

~$1 / toma 10s. La continuidad no agrega costo; solo cambia el input (frame previo).

## Evidencia

`omni_ref_test.mp4` (frame de origen: `omni_shot1_frame.png`) — 2026-07-05, `efeonce-group`.
