# TASK-2002 — Motion del calendario de activaciones (Marketing Studio)

## Contrato vigente · 2026-10-05

- **Estado:** implementado y verificado en local (Studio `7e081d0` rendimiento + `11ec7fa` motion, sin push). Producción
  sigue en `5d962c4` hasta la señal del operador.
- **Dirección aprobada:** canvas Design «v3.6 · Motion (para aprobar)» (artifact `D6uwRFMzvnaHzGDtDLvxBi`, versión 48):
  tablero de sistema + tableros interactivos de navegación, superficies, respuesta y hoja móvil, en claro y oscuro.
  Aprobado por el operador el 2026-10-05 («Me gustan todos»).
- **Fuente de valores:** `axisMotion` de `@efeoncepro/axis-tokens` 0.2.5, materializado por
  `apps/web/scripts/generate-theme.mjs` en `theme.generated.css`. Antes Studio usaba `efeonceTokens.motion` (150/220 ms);
  220 ms no existe en la escala AXIS y pasa a 200.

## Meta

- Status: `implemented` (local; despliegue pendiente de señal).
- Owner task: `TASK-2002 — Marketing Studio: calendario de activaciones y ejecución en la UI`.
- Related wireframe: `docs/ui/wireframes/TASK-2002-marketing-studio-activations-calendar.md`.
- Related flow: `docs/ui/flows/TASK-2002-marketing-studio-activations-calendar-flow.md`.
- Motion type: `system` (tokens + momentos del calendario).
- Primary primitive / library: CSS (transiciones y `@keyframes`), React 19.3 `<ViewTransition>` con `transitionTypes` de
  la navegación de Next 16, Web Animations API para FLIP. Sin librerías nuevas.
- Copy source: `apps/web/src/copy.ts` (`activations.notice`, `activations.write.done`, `loading.sheet`).

## Tokens

| Token CSS | Valor | Fuente AXIS | Uso |
|---|---|---|---|
| `--motion-instant` | 75 ms | `duration.instant` | presión de botón y tarjeta |
| `--motion-short` | 150 ms | `duration.short` | hover, color, foco, salidas de menús y popover (reemplaza `--motion-fast`) |
| `--motion-standard` | 200 ms | `duration.standard` | menús, selectores, aviso, color de estado, salida de hoja |
| `--motion-medium` | 300 ms | `duration.medium` | entrada de hoja y hoja móvil, cambio de mes, contador |
| `--motion-long` | 400 ms | `duration.long` | Mes · Semana · Día, reacomodo FLIP, anillo de estado |
| `--motion-extended` | 600 ms | `duration.extended` | halo de guardado |
| `--ease-emphasized` | `cubic-bezier(0.2, 0, 0, 1)` | `ease.emphasized` | entradas y desplazamientos |
| `--ease-standard` | `cubic-bezier(0.4, 0, 0.2, 1)` | `ease.standard` | cambios en el lugar |
| `--ease-exit` | `cubic-bezier(0.3, 0, 0.8, 0.15)` | `ease.emphasizedAccelerate` | salidas |
| `--ease-linear` | `linear` | `ease.linear` | brillo del esqueleto, barra de progreso |

Principios: explica y no decora · responde al instante y termina rápido (la salida, más corta) · tiene origen y dirección
· es honesto y se puede reducir.

## Motion Inventory

| Momento | Disparador | Qué se mueve | Entrada | Salida |
|---|---|---|---|---|
| Espera de navegación | filtro, mes, vista, hoja | `.cal-body`, `.cal-side`, barra superior | atenúa a 0,55 tras 150 ms | vuelve a 1 |
| Cambio de mes | flechas, Re/Av Pág, Hoy | `<ViewTransition>` `.cal-forward`/`.cal-back` | 300 ms desde ±32 px, fundido 150 ms sin retraso | 150 ms hacia ∓24 px, fundido 120 ms |
| Mes · Semana · Día | selector, número del día | `.cal-zoom-in`/`.cal-zoom-out` desde la celda de hoy (`--vt-origin`) | 400 ms scale 0,9 → 1 (o 1,06 → 1) | fundido 120 ms; la caja salta a su tamaño final |
| Hoja de activación | tarjeta | `.sheet` + fondo | 300 ms desde 24 px; fondo 200 ms; en ≤ 860 px sube desde abajo | 200 ms hacia 24 px; fondo 150 ms |
| Drawer y diálogo de escritura | acción | `.wdrawer` / `.wmodal` | drawer como la hoja; diálogo scale 0,96 → 1 en 200 ms | 200 / 150 ms |
| Menú de filtro, selector de fecha, popover del día | chip, campo, celda | scale + opacity con `transform-origin` en el disparador | 200 ms | 150 ms (menú y popover) |
| Filtrar | elegir opción | FLIP con WAAPI (máx. 120 tarjetas) + contador | se mueven 400 ms; entran 200 ms (+100 ms) | copias que se encogen 150 ms |
| Escribir | enviar | botón · halo · aviso | spinner a los 150 ms; check 200 ms; halo 600 ms; aviso 200 ms | aviso 150 ms (6 s, pausa con puntero o foco) |
| Hover y presión | puntero fino | `.acard` | hover 150 ms (−1 px + sombra); presión 75 ms scale 0,985 | — |
| Cambio de estado | lectura nueva entre pinturas | `.xchip` | color 200 ms; anillo 400 ms una vez | — |
| Primera carga | llegada desde el esqueleto | filas (`.mgrid-week`, `.wgrid-band`, `.tl-row`, `.week-list-day`) | 200 ms, 30 ms entre filas (máx. 8) | — |
| Hojas móviles | arrastrar barra o manija | `translateY` 1:1 | — | cierra con > 25 % del alto o > 0,5 px/ms en el último tramo (200 ms); si no, vuelve en 300 ms |

## Design Decision Log

| Fecha | Decisión | Motivo |
|---|---|---|
| 2026-10-05 | Escala y curvas de `axisMotion`; 220 ms pasa a 200 | AXIS es la fuente de valores; 220 no está en su escala |
| 2026-10-05 | View Transitions de React para mes y vista; FLIP manual con WAAPI al filtrar | Mes/vista cambian todo el contenido; al filtrar, los nombres por tarjeta en cada transición pesarían con cientos de tarjetas |
| 2026-10-05 | El tipo de transición se infiere de las URLs en `CalendarNav` | Sin marcar cada enlace; una sola regla probada |
| 2026-10-05 | Fundidos cruzados sin hueco y `root` sin animación | La primera grabación mostró un cuadro vacío y texto fantasma en el título |
| 2026-10-05 | Entradas con `fill-mode: backwards` | Una entrada `both` retenía `transform` y la hoja de filtros no seguía el dedo |
| 2026-10-05 | Velocidad del último tramo para cerrar al arrastrar | El promedio cerraba la hoja aunque el dedo se detuviera antes de soltar |
| 2026-10-05 | Deshacer sólo en «Reprogramar» | Es la única escritura con inverso real (reprogramar de vuelta con la revisión nueva); cancelar no tiene inverso |

## Reglas de coordinación

- `CalendarNav` infiere el tipo de transición comparando la URL actual con la de destino (`transition-kind.ts`, con test):
  período → `nav-forward`/`nav-back`; nivel de vista → `view-in`/`view-out`; filtros → FLIP; hoja, popover y diálogo → nada.
- El resto de la página (título, conteo, panel lateral) cambia en seco durante la View Transition (`root` sin animación):
  evita texto fantasma.
- Entradas con `animation-fill-mode: backwards`; salidas con `both`. Una entrada `both` retiene `transform` y bloquea el
  arrastre de la hoja.
- El aviso, el check y el halo se emiten sólo después de la confirmación del servidor. Deshacer existe sólo en
  «Reprogramar» y aplica el comando real con la revisión nueva.

## Reduced Motion

`prefers-reduced-motion: reduce`: las View Transitions se vuelven fundidos de 150 ms; hoja, drawer, diálogo, menús,
popover, aviso y hoja móvil entran y salen con fundido; sin FLIP, sin escalonado, sin halo, sin anillo ni trazo del check;
el contador salta; el hover no desplaza; la barra de progreso queda fija; las salidas no esperan. El arrastre sigue
funcionando. La regla global previa de `app.css` (`transition: none`) se mantiene.

## GVC / Micro Evidence

Local, 2026-10-05.

- Playwright contra build de producción en `:3103` (base local desechable): tipos de View Transition `nav-forward`,
  `nav-back`, `view-in` (origen `7.2% 31.6%`), `view-out`; menú `m-pop-in` → `is-closing` → desmontado; FLIP 15–16
  animaciones sin View Transition; salida de la hoja `m-sheet-out`; hover `translateY(-1px)` + sombra; consola sin errores.
- Movimiento reducido emulado: fundidos, sin FLIP, hoja que cierra sin esperar, hover sin desplazamiento.
- Videos 1440 claro/oscuro y 390 px oscuro con fotogramas revisados: sin cuadro vacío entre meses (corregido tras la
  primera revisión) y sin doble exposición larga.
- Escritura real en local con ventana temporal: reprogramar → check a ~110 ms de la respuesta → aviso con Ver y Deshacer →
  halo aplicado → Deshacer devuelve la fecha original.
- Arrastre: gesto corto y lento vuelve a 0 px; gesto largo cierra la hoja de filtros y la de activación.
- No verificado: anillo de cambio de estado con una lectura real (requiere un readback nuevo) ni rendimiento en producción.
