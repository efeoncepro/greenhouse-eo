# Hoja de revisión de takes — Glitch: «El micrófono se abre»

> Usar una copia por take. Un take con rechazo automático no puede ganar por puntaje estético.

## Identificación

| Campo | Valor |
| --- | --- |
| Take | `A · natural` / `B · táctil` / `C · señal` |
| Archivo master | |
| Referencia 4K / SHA-256 | |
| Prompt | |
| Fecha / operador | |
| Duración, fps, dimensiones | |
| Coste reportado por metadata | |

## Rechazo automático

Marcar cualquiera de estos criterios como `sí` rechaza el take sin importar el puntaje.

| Rechazo | Sí / no | Nota / frame |
| --- | --- | --- |
| Dedos extra, uñas mutantes, articulaciones invertidas o identidad de mano inestable | | |
| El dedo atraviesa o deforma la malla / el micrófono / el brazo | | |
| Cámara con zoom, paneo, órbita, handheld o reencuadre no dirigido | | |
| La secuencia no se lee como `strike → rebound → strike → rebound`, el contacto parece presión sostenida, o la señal aparece antes del segundo contacto / se vuelve VFX dominante | | |
| El `ON AIR` no nace como practical del set desde el primer fotograma, muta, deriva, se vuelve blur, parece overlay o tapa el dedo u otro sujeto foreground | | |
| Texto, logo, UI o glitch digital generado que reclame atención | | |
| Sin impacto/rebote humano: parece still con zoom, presión sostenida, botón o doble click mecánico | | |

## Rúbrica de selección

Puntuar cada fila de `0` a su máximo. El take pasa con **20/25 o más**, ningún criterio esencial bajo `3`, y ningún rechazo automático.

| Criterio | Máx. | Puntaje | Evidencia / frame |
| --- | ---: | ---: | --- |
| Anatomía y física de la yema, mano y micrófono **(esencial)** | 5 | | |
| Doble contacto: hold → strike → rebound → strike → rebound → settle **(esencial)** | 5 | | |
| Staging, cámara, foco y continuidad con el key visual **(esencial)** | 4 | | |
| Respuesta de señal posterior, mínima y motivada | 3 | | |
| Luz, color y textura: broadcast nocturno sin artefactos | 3 | | |
| Audio: exactamente dos ticks de contacto sin música/room tone/beep | 2 | | |
| Potencial de corte hacia el handoff de Glitch | 3 | | |
| **Total** | **25** | | |

## Revisión en movimiento

- [ ] Vista completa a velocidad real.
- [ ] Vista a 0,5×.
- [ ] Ambos strikes/rebounds y el hover entre ellos revisados frame a frame alrededor de `00:00:00:04–00:00:01:05`.
- [ ] Revisado en monitor, laptop y móvil.
- [ ] Contact sheet a 1 fps guardada bajo `review/`.
- [ ] `ffprobe` confirma 9:16, 24 fps y duración.

## Dictamen

| Decisión | Justificación | Próximo paso |
| --- | --- | --- |
| `aprobar para post` / `reintentar` / `descartar` | | |

## Aprendizaje del piloto

- Qué instrucción del prompt funcionó:
- Qué instrucción falló o se interpretó mal:
- Qué se debe cambiar antes de una segunda ronda:
- ¿El workflow es candidato a promoción? `sí` / `no` / `aún no`:
