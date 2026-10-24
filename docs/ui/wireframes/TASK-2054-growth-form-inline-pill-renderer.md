# TASK-2054 — Growth Forms: formulario en línea (píldora que se transforma) — wireframe

> Superficie: `<greenhouse-form>` con `presentation: 'inline_pill'` (contrato de TASK-2053) dentro de la portada del
> blog v3. Fuente: canvas aprobado v67, bloques Glitch (`.gxs`) y Eventos (`.gxs--ev`)
> (`docs/ui/visual-directions/TASK-2051-blog-portada-v3/`).

## Visual Direction Contract

- **Fuente:** `source-led`, los estados del canvas medidos en render: reposo, abierto, enviando, éxito, listo.
- **Targets:** 1440 (Glitch: 252 → 480 → 304 px; evento: 236 → 470 → 360 px) y 390 (ancho completo en todos los estados).
- **Jerarquía:** el botón es la acción; al abrir, el foco pasa al campo; el envío es el botón dentro de la píldora.
- **Visual fidelity mapping:**
  - Contenedor 52 px de alto, radio 999 px, borde 1 px; transición de ancho 520 ms `cubic-bezier(0.2,0,0,1)`.
  - Abierto: fondo translúcido + borde del tono (Glitch `rgba(110,194,7,.6)`, evento `rgba(54,200,191,.6)`), foco en el tono pleno; campo 16 px Poppins blanco, placeholder `rgba(207,228,250,.6)`; botón interno 42 px.
  - Éxito: relleno del tono, pulso `scale(1.035)`, check navy que se dibuja (420 ms), «¡Listo!» / «¡Lugar reservado!».
  - Listo (a 1,4 s): borde del tono, check del tono, texto blanco «Ya estás suscrito a Glitch» / «Te esperamos el …».
  - Nota legal 12 px bajo la píldora sólo en abierto/enviando.
  - Sin contorno interno del campo (el foco lo marca la píldora).
- **GVC:** `qualityProfile: premium`; captura de cada estado a 1440 y 390.

## Layout

### Escritorio

```
[ Suscríbete a Glitch → ]                       reposo (252)
[ tu@empresa.com ............ [Suscribirme →] ]  abierto (480) + nota legal
[ tu@empresa.com (atenuado)    [  ◌ loader  ] ]  enviando
[        ✓ ¡Listo!                           ]  éxito (relleno)
            [ ✓ Ya estás suscrito a Glitch ]     listo (304)
```

### Teléfono

Los mismos estados a ancho completo; la nota legal a la izquierda.

## Content Slots

| Slot | Origen |
|---|---|
| `openLabel`, `submitLabel`, `successLabel`, `doneLabel`, `note` | `inlinePill` del contrato (TASK-2053) |
| Tono | tokens `--ghf-inline-*` desde el host (Glitch verde, evento turquesa) |

## States

- Reposo, abierto, enviando, éxito, listo; error de validación (mensaje bajo la píldora, foco al campo); error de red
  (mensaje + «Reintentar» si `actionable`).
- Sincronización: si otra instancia del mismo formulario confirma (suscripción final), esta pasa a «listo».
- Movimiento reducido: cambios de estado sin estiramiento ni pulso.
- Sin JS: enlace a la suscripción de abajo.

## Implementation Mapping

- `src/growth-forms-renderer/renderer.ts`: rama `inline_pill` que envuelve el formulario existente (mismo envío, mismo consentimiento).
- `src/growth-forms-renderer/` CSS: hooks `data-ghf-inline-state` y tokens `--ghf-inline-*`.
- `telemetry.ts`: `CustomEvent` de éxito que burbujea (para sincronizar instancias).

## GVC Scenario Plan

- Fixture local con el contrato `inline_pill` y respuesta de envío simulada.
- Capturas de los cinco estados a 1440 y 390; comparación ≤ 1 % contra el canvas.
- Recorrido con teclado: Tab al botón, Enter abre, foco en el campo, Esc cierra, envío.

## Design Decision Log

- **Decisión:** la presentación vive en el renderer (tokens + hooks), no como piel a mano en la página.
- **Alternativas:** CSS del host alrededor del formulario estándar (frágil y repetido en cada landing).
- **Por qué:** mismo principio que TASK-2045: el siguiente diseño sólo declara valores.
- **Riesgo:** dos instancias del mismo formulario en una página (verificar envío y estado compartido).
