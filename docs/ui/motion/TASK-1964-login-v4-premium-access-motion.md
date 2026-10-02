# TASK-1964 — Login V4 premium · Motion Contract

## Meta

- Task: `TASK-1964` · Wireframe: `docs/ui/wireframes/TASK-1964-login-v4-premium-access.md` · Flow: `docs/ui/flows/TASK-1964-login-v4-premium-access-flow.md`
- Rigor: **de marca** en el escenario y la transición; **funcional** en el formulario. Principios de `efeonceGraphicLine.motion`: lento → rápido → lento, un protagonista a la vez, llegar con golpe; curvas `emphasized` (llega), `standard` (transforma), `emphasizedAccelerate` (se va).
- Regla de la línea: la órbita **recorre**, nunca se llena como loader; una esfera por pieza.

## Motion Inventory

| # | Elemento | Comportamiento | Tiempo | Curva |
|---|---|---|---|---|
| M1 | Formulario | Entra con fade + 16 px | 600 ms, delay 60 ms | emphasized |
| M2 | Foto de la novedad | Cross-fade entre novedades | 1200 ms | emphasized |
| M3 | Foto (Ken Burns) | Escala 1.07 → 1 durante la novedad | 10 s | emphasized |
| M4 | Lente | Anillo se dibuja → arco → la esfera nace con sobrepaso (`overshoot.sphereBirth = 2`) | 700 / 900 / 320 ms | emphasized |
| M5 | Texto de la novedad | Kicker, titular y apoyo suben escalonados | 700 ms c/u, +150 ms | emphasized |
| M6 | Progreso de pestañas | Barra recta que avanza con el tiempo de la novedad | intervalo (9 s) | lineal |
| M7 | Botón «Validando acceso» | Mini órbita: la esfera recorre el anillo con estela | 1600 ms por vuelta | slow-fast-slow |
| M8 | La lente se abre | Capa de papel que entra por `clip-path: circle()` desde el centro de la lente activa (móvil: desde el botón Entrar) hasta cubrir la ventana; el logo Efeonce aparece en el lugar del encabezado y el `OrbitLoader` con el estado; después el cambio de ruta corre dentro de `startViewTransition` (cross-fade root existente) hacia `/auth/landing`, que muestra la misma escena | 900 ms | emphasized |
| M9 | `OrbitLoader` | Anillo fino + esfera que recorre con estela de 50° | 1600 ms por vuelta | slow-fast-slow |
| M10 | Llegada | La esfera asienta a las 12 y el anillo hace onda (`wave.fromScale 1.02 → toScale 1.5`) | 700 ms | emphasized |
| M11 | Microinteracciones | Hover de botones, foco del campo (borde navy + halo), presión del botón (scale .985) | 150–200 ms | standard |

## Reglas

- Ningún elemento parte invisible dependiendo de su animación: las animaciones usan `animation-fill-mode: both` sin `opacity: 0` base (lección del prototipo 2026-10-02: el editor sin animaciones dejaba el formulario oculto).
- El formulario aparece de inmediato; la animación de marca nunca bloquea el ingreso.
- El paso N6 (loader) sólo se ve si la resolución de sesión tarda; no se fuerza un tiempo mínimo.
- Tiempos y curvas desde `src/components/theme/motion-tokens.ts` / `efeonceGraphicLine.motion`; ningún tiempo escrito a mano fuera de la tabla de tokens del componente.

## Reduced motion

- Sin Ken Burns, sin dibujo de la lente, sin view transition ni giro del loader (esfera estática a las 12 con el texto de estado), carrusel arranca en pausa. Se conservan anuncios `aria-live` y foco.

## Non-goals

- Sin parallax por puntero, sin partículas, sin logo 3D (reemplaza a `TASK-233`).

## Delta 2026-10-02 — Lo implementado

- **M4 (lente):** la geometría sale del canon de AXIS (`paintGraphicLine` / resolver de la lente): arco de 50° con ángulo derivado de `AXIS_GRAPHIC_LINE_POSITION_DEGREES` (`upper-start`), trazos y esfera escalados por ancho. Corregido un defecto: `vector-effect: non-scaling-stroke` junto con `pathLength` partía el arco en dos tramos.
- **Novedad sin lente:** M4 no corre; la foto entra a color entero con M2/M3.
- **Voz:** el anillo pequeño del kicker y la esfera del titular son estáticos (marcas tipográficas, no animación).
- **Sin verificar:** captura con `prefers-reduced-motion: reduce`; visibilidad real de M9 (`OrbitLoader`) en caliente; sin evidencia registrada de M10 (llegada).
- **Pendiente (operador: «después»):** transiciones adicionales del acceso.
