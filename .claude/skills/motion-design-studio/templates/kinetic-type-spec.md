# Kinetic Type Spec — [Nombre del proyecto]

> **Qué es esto.** El plan de tipografía kinética: cuando **el texto ES la animación** (title
> sequence, opener, lower-thirds, mensaje sin personaje). Define qué se anima, cómo, y con qué
> sincronía al audio. Regla dura: **legibilidad primero** — un texto animado que no se lee, no
> comunica. Doctrina: `modules/05_MOTION_GRAPHICS_KINETIC.md`; craft fino de tipo → `typography-design`.

## Encuadre

| Campo | Valor |
|---|---|
| Pieza / bloque | [nombre · title sequence / lower-third / mensaje full-frame] |
| Duración | [Xs] |
| Aspecto | [16:9 · 9:16 · 1:1] |
| Sonido en destino | [ON · OFF — decide si el texto debe cargar el mensaje solo] |

## Texto y jerarquía

Escribe el mensaje completo y su jerarquía por línea. Menos texto = más impacto.

| Línea / bloque | Contenido | Jerarquía | Rol |
|---|---|---|---|
| 1 | [texto] | [H1 / display] | [mensaje clave] |
| 2 | [texto] | [H2 / apoyo] | [contexto] |
| 3 | [texto] | [caption / CTA] | [cierre] |

## Técnica de animación por bloque

| Bloque | Técnica de entrada | Técnica de salida | Notas de movimiento |
|---|---|---|---|
| 1 | [reveal por máscara · scale-up · track-in (letter-spacing) · fade+blur] | [ ] | [ease, dirección, stagger por carácter/palabra] |
| 2 | [ ] | [ ] | [ ] |
| 3 | [ ] | [ ] | [ ] |

> Técnicas canónicas: **reveal** (máscara/wipe), **scale** (in/out con ease), **track** (letter-spacing
> animado), **mask** (texto detrás de forma), **stagger** (cascada por carácter/palabra/línea).

## Timing y sync a audio/beat

- **BPM / tempo de referencia.** [n] — coordina con `sound-design-brief.md`
- **Hit points.** [en qué beats/palabras cae cada entrada — "línea 1 entra en downbeat 1"]
- **Duración legible por bloque.** [tiempo mínimo en pantalla para leer sin esfuerzo — regla: ≥ el tiempo de leerlo 1,5 veces]
- **Ritmo.** [staccato/rápido kinético · o pausado/cinemático — coherente con el tono del brief]

## Tipografía

- **Fuente(s) y peso(s).** [familia · peso display · peso texto] — decisiones de craft en `typography-design`
- **Casing / tracking.** [uppercase/sentence · tracking display] — cuidado: uppercase pierde legibilidad si es largo
- **Numerales / features.** [tabular si hay cifras alineadas · ligaduras · alternates]

## Fondo y composición

- **Plate / fondo.** [color plano · gradiente · plate de video · partículas/humo/grano]
- **Contraste texto↔fondo.** [ratio objetivo · si el plate se mueve, garantizar contraste en todo frame]
- **Profundidad.** [texto sobre / dentro / detrás del fondo · sombras, glow, flares con criterio]

## Legibilidad y safe zones

- **Safe zones.** [title-safe / action-safe respetadas · captions no chocan con UI de red social]
- **Legibilidad en movimiento.** [el texto se lee mientras entra, no solo al asentarse]
- **Prueba a tamaño real.** [revisar en el device de destino, no solo en canvas grande]

## Checklist de cierre

- [ ] Todo bloque de texto es legible el tiempo suficiente para leerse cómodo
- [ ] Las entradas caen en hit points del audio (no flotan sueltas)
- [ ] La técnica sirve al mensaje (el movimiento no compite con la lectura)
- [ ] Jerarquía clara: el ojo va primero al mensaje clave
- [ ] Contraste texto↔fondo se sostiene en TODO frame (fondo en movimiento incluido)
- [ ] Fuente/peso/tracking validados con `typography-design`
- [ ] Safe zones y captions no chocan con la UI del destino
- [ ] Si el destino es sonido-OFF, el texto carga el mensaje por sí solo
