# Revisión V3 — blocking 3D integral

> Veredicto final: **RECHAZADO POR DIRECCIÓN VISUAL; no continuar.** El timing técnico funciona, pero la reconstrucción se ve rudimentaria y no conserva el estándar del key visual. El operador la rechazó expresamente.

## Qué se construyó

- Escena nueva y continua en Blender 5.1.2; cinco segundos, 24 fps, 120 frames.
- Micrófono, boom, consola, luces y caja `ON AIR` modelados proceduralmente en la misma escena.
- `ON AIR` son letras con extrusión/material emisivo y luz roja física. No existe backplate, overlay, tracking, máscara, crop ni composición posterior.
- Mano proxy animada con contactos sólo en frames 15 y 28.
- Sin audio: el gate de corneta se ejecutará sólo después de aprobar la imagen.

## Gates

| Gate | Estado | Evidencia |
| --- | --- | --- |
| Toma integral | Pasa | Todos los elementos viven en un único `.blend`; no hay capas de finish visual |
| Practical diegético | Pasa técnicamente | Caja, letras emisivas y spill de luz dentro de la escena |
| Hover inicial | Pasa | Frame 1 con aire visible |
| Contacto 1 | Pasa | Frame 15 es el único contacto; frame 16 ya rebota |
| Pausa aérea | Pasa | Frames 16–26 separados de la rejilla |
| Contacto 2 | Pasa | Frame 28 es el único contacto; frame 29 ya rebota |
| Diseño/cámara/fidelidad 4K | **Falla — rechazo automático** | Silueta, encuadre, mano, micrófono, materiales y luz quedan materialmente por debajo del 4K; dirección cerró la ruta |
| Mano humana/skin/lookdev | **Falla como final** | Proxy geométrico, no malla humana aprobable |
| Audio de corneta | **No procede** | El gate visual falla antes; no se genera ni mezcla audio |

## Artefactos

Los tres binarios viven únicamente en el prefijo privado GCS `v3-blocking/`; hashes y tamaños están en `v3-blocking.metadata.json`. El script reproducible es `build-blender-v3-blocking.py`.

## Decisión final

No se incorpora ni riggea otra mano, no se continúa camera match/lookdev, no se renderiza una secuencia realista y no se pasa este blocking a un modelo de video. La escena y el MP4 quedan sólo como evidencia privada de una dirección descartada. No hay master, candidata, publicación ni output de producción.
