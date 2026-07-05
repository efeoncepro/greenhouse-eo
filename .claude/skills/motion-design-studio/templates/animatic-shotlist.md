# Animatic + Shotlist — [Nombre del proyecto]

> **Qué es esto.** El animatic pone el storyboard en el tiempo con audio scratch: es la primera vez
> que el RITMO existe. La shotlist traduce cada plano aprobado en una orden de producción (qué se
> genera, cómo, con qué mano). Regla dura: **el ritmo se aprueba en el animatic, no en el master** —
> corregir pacing con tomas ya renderizadas quema créditos. Doctrina: `modules/02` + `modules/04` + `modules/06`.

## Encuadre

| Campo | Valor |
|---|---|
| Pieza | [nombre · tipo · duración objetivo] |
| Basado en storyboard | [link a storyboard.md] |
| Música/tempo de referencia | [BPM · track de scratch] — ver `sound-design-brief.md` |
| Estado del animatic | [en armado · en revisión de ritmo · aprobado] |

## Animatic — timing acumulado

Frames del storyboard puestos en secuencia con audio scratch y una nota de beat por toma.

| # | In (acum.) | Out (acum.) | Dur. | Frame/plano | Audio scratch | Nota de ritmo / beat |
|---|---|---|---|---|---|---|
| 1 | 00:00 | 00:03 | 3s | [still 1] | [música baja · VO línea 1] | [entra lento, respira antes del gancho] |
| 2 | 00:03 | 00:06 | 3s | [still 2] | [SFX whoosh en corte] | [acelera · corte en el downbeat] |
| 3 | 00:06 | 00:10 | 4s | [still 3] | [música sube] | [plano más largo = deja respirar el clímax] |
| 4 | 00:10 | 00:13 | 3s | [still 4] | [ ] | [ ] |
| 5 | 00:13 | 00:15 | 2s | [still 5 · logo] | [stinger final] | [cierre seco en el último hit] |
| — | (agrega filas) | | | | | |

> **Total acumulado = duración objetivo.** Si la última fila no cierra en el número del brief, el
> ritmo no cuadra: recorta/estira acá.

## Shotlist de producción

Cada plano aprobado, con su método de producción y sus insumos. Alimenta `shot-prompt-sheet.md`.

| # | Qué muestra la toma | Mano | Modelo/herramienta | Refs / keyframes | Consistencia | Notas |
|---|---|---|---|---|---|---|
| 1 | [ ] | [IA · humano · híbrido] | [Higgsfield · Runway · AE · Blender] | [start/end keyframe · KV] | [Soul ID / refs · n/a] | [ ] |
| 2 | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| 3 | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| 4 | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| 5 | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |

## Presupuesto de producción (créditos IA)

| Toma(s) IA | Chunks (5-8s) | Modelo | Costo aprox. | Reintentos previstos |
|---|---|---|---|---|
| [ ] | [ ] | [ ] | [ ] | [ ] |

- **Tope total de créditos.** [Nº] — gasto gobernado (`SKILL.md` §4). Si se excede, para y confirma.

## Checklist — ¿el ritmo funciona ANTES de producir?

- [ ] El animatic se siente completo aunque los frames sean stills (el timing sostiene la historia)
- [ ] Los cortes caen con la música (downbeats / hit points marcados)
- [ ] Hay variación de duración de toma (no todo 3s; el clímax respira, el gancho es ágil)
- [ ] No hay muertos: ninguna toma se siente larga o vacía al reproducir
- [ ] El total acumulado = duración objetivo exacta
- [ ] Cada toma de la shotlist tiene mano, modelo e insumos definidos
- [ ] El presupuesto de créditos está dentro del tope del brief
- [ ] Ritmo APROBADO por el owner antes de gastar un solo crédito de producción
