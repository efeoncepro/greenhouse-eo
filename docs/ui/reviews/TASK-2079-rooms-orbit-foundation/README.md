# TASK-2079 — Dossier GVC de la base visual

Captura GVC `rooms-orbit-foundation` del 2026-10-30 (`.captures/2026-10-30T21-06-11_rooms-orbit-foundation`, local, no versionada),
contra `efeonce-rooms` en `http://127.0.0.1:3210/demo/base`, rama `claude/rooms-approved-ui`. Resultado: **OK** en 1440×900, 390×844 y
320×740; accesibilidad, layout, consola, hidratación, assets, teclado (iris con Enter/Escape y retorno de foco) y rúbrica enterprise sin hallazgos.

| Archivo | Qué muestra |
|---|---|
| `01-desktop-orbit-canonical.png` | Órbita canónica con halo y «Entra.» |
| `02-desktop-orbit-measure.png` | Arco que mide 3 de 5 desde las 12 |
| `03-desktop-camera-map.png` | Mapa: cinco escenas, anillo y arco de recorrido real (2 de 5) |
| `04-desktop-camera-scene.png` | Escena 03 tras el salto orbital |
| `05-mobile-orbit-canonical.png` | Órbita móvil (radio 140) |
| `06-compact-orbit-measure.png` | 320 px sin desborde |

Hallazgos corregidos durante la verificación: el SVG del mapa colapsaba a ancho cero por la regla global `svg { max-inline-size: 100% }`;
la caja de la órbita incluía el halo y la descentraba en móvil; los trazos bajaban de 1 px en radios chicos; el cierre animado del iris
hacía esperar al teclado (ahora es corte); el selector de fracción desbordaba 320 px.

Pendiente: revisión humana del operador; grosor de trazo derivado del token (algo más fino que el canvas).
