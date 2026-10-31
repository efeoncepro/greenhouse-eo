# TASK-2068 — Motion de la invitación

Contrato reescrito el 2026-10-31 desde el canvas aprobado (`Invitacion`, `InvitacionMovil`, `Estados` y la nota
«Motion — gramática de la sala») y el código de `efeonce-rooms` `claude/rooms-approved-ui`
(`src/styles/invitation-stage.css`, `src/components/invitations/invitation-entry.tsx`). Hereda
[TASK-2079](TASK-2079-rooms-orbit-foundation-motion.md): la órbita se dibuja una vez y queda quieta; la autoridad nunca
se anima.

Valores: `ORBIT_TIMING`, `ORBIT_EASE`, `SPHERE_BIRTH_EASE` y `PARALLAX` de `src/components/orbit/motion.ts`;
`--room-ease-arrive` (`emphasized`, `cubic-bezier(0.2, 0, 0, 1)`), `--room-ease-transform` (`standard`,
`cubic-bezier(0.4, 0, 0.2, 1)`) y `--room-duration-short` (150 ms) de `src/styles/theme.ts`. La espera de «Listo.» es
`READY_HOLD_MS = 1400` en `invitation-entry.tsx`.

## Inventario

| Movimiento | Disparo | Duración | Curva | Qué se mueve | Movimiento reducido |
|---|---|---|---|---|---|
| Dibujo de la órbita | Montaje | Anillo 0–500 ms; arco 400–1400; esfera 1400–1700; halo 1200–2000 | `arrive`; la esfera con `SPHERE_BIRTH_EASE` (`cubic-bezier(0.34, 1.56, 0.64, 1)`) | `stroke-dashoffset` del anillo y del arco, escala de la esfera, opacidad del halo | La órbita aparece completa |
| Entrada de «Entra.» | Montaje | 1000 ms tras 200 ms | `arrive` | `clip-path: inset(100% 0 0 0)` → `inset(0)` y `translateY(60px)` → 0 | La palabra ya está |
| Subida de elementos | Montaje | 800 ms con espera de 700 ms + 70 ms por elemento | `arrive` | Ojal (0), etiqueta de la sala (1) y casillas 1–6 suben 28 px y aparecen | Sin animación |
| Lados | Montaje | 1000 ms; izquierda tras 900 ms, derecha tras 990 ms | `arrive` | «Te invita» entra desde −24 px y «Para» desde +24 px | Sin animación |
| Panel de estado | Cambio a un estado bloqueado | 700 ms tras 600 ms | `arrive` | El panel sube y aparece; «Entra.» baja a opacidad 0,32 en 500 ms | Panel y opacidad directos |
| Dígito | Cada dígito escrito | 360 ms | `cubic-bezier(.34, 1.56, .64, 1)` literal (mismo valor que `SPHERE_BIRTH_EASE`) | El dígito crece de 0,4 a 1 con un rebote corto | Aparece sin animación |
| Casilla | Llenar o activar | 150 ms (`--room-duration-short`) | `transform` | Borde y fondo de la casilla | Directo |
| Cursor de la casilla | Foco en el código | 1000 ms en bucle | `steps(1)` | El cursor teal parpadea en la casilla activa | Cursor fijo |
| Temblor de error | `invalid_code` | 420 ms | `transform` | Las casillas se desplazan −14, +10, −6, +3 px y vuelven | Sin temblor; el error se dice con texto y `role="alert"` |
| Relevo «Entra.» → «Listo.» | Verificación correcta | 900 ms (`clip-path` y `transform`), 500 ms (opacidad); «Listo.» empieza 250 ms después | `arrive` y `transform` | «Entra.» sale hacia arriba (`inset(0 0 100% 0)`, −60 px) y «Listo.» entra desde abajo | Cambio directo |
| Espera antes de la sala | Tras «Listo.» | 1400 ms | — | Nada se mueve; se lee «Listo.» | 0 ms: la sala se abre de inmediato |
| Paso a la sala | Fin de la espera | Navegación de documento | — | Sin View Transition ni captura de contenido | Igual |
| Parallax | Movimiento del puntero | Suavizado 0,08 por cuadro | — | Órbita ± 7 px y texto ± 14 px | Desactivado; también en táctil |
| Grano | — | Estático | — | — | Se mantiene |

## Reglas

- La órbita no indica espera. Verificar se dice con texto («Verificando el código…») y con el botón deshabilitado.
- La espera de reenvío y la pausa por intentos son texto que cambia cada segundo; no hay cuenta regresiva animada ni
  anuncio por segundo.
- Nada se anima al ganar o perder autoridad: verificar abre un documento nuevo, cerrar la sesión interna vuelve a leer, y
  al perder el acceso en la sala el contenido se retira del DOM sin transición.
- El foco no espera a ninguna animación: el código conserva el foco durante el error; tras reenviar, el foco vuelve al
  campo de inmediato.
- `prefers-reduced-motion` se reevalúa en caliente; la decisión de esperar 1400 ms se toma con `shouldAnimate` en el
  momento de validar.
- Contraste durante las entradas: los textos llegan por opacidad sobre `--room-ground` y terminan en su contraste
  final; la entrada más larga termina a los 1990 ms del montaje (lado derecho). El contraste transitorio se mide en GVC,
  no se supone.

## GVC / Micro Evidence

- `.webm` de `/demo/invitacion` en 1440×900 y 390×844: montaje completo, escribir seis dígitos (pop), `000000` (temblor y
  error), un código correcto (relevo «Listo.»).
- `?estado=intentos` con la espera visible y `?estado=vencido` con el panel.
- Repetir con `prefers-reduced-motion: reduce`: todo directo y la navegación sin espera (verificable en `/invite` con la
  integración).
- Medir que ningún cuadro supere 16 ms durante el dibujo y el parallax en escritorio.
- Dossier: `docs/ui/reviews/TASK-2068-rooms-invitation-and-guest-experience/`.

## Design Decision Log

- 2026-10-30 — Se adopta el temblor de error del canvas; el contrato anterior decía «sin shake». Se acompaña siempre de
  texto con `role="alert"` y desaparece con movimiento reducido.
- 2026-10-30 — «Listo.» se sostiene 1400 ms (tiempo del canvas) para que la confirmación se lea antes del cambio de
  documento; con movimiento reducido no hay espera.
- 2026-10-30 — Sin View Transition hacia la sala: es un cambio de autoridad, no de vista.
- Deuda: el rebote del dígito declara su curva en CSS en lugar de leer `SPHERE_BIRTH_EASE`; se unifica cuando el valor
  pase a una variable del tema.
