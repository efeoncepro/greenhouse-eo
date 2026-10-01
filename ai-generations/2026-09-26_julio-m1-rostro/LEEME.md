# M1 · Julio con Clawd y Codex — rostro con identidad vigente (2026-09-26)

Pedido del operador (comentario en el canvas de AXIS): sustituir el rostro de `rondas/mascotas/M1-julio-clawd-codex-plate.png`
(generado el 19-09 con el set de 2026-09-17, retirado porque idealizaba el rostro) por sus rasgos reales.

- Método: injerto de rostro por edición (canon «editar conserva»). Imagen 1 = plate original, imágenes 2 y 3 =
  `2026-09-20_identidad-julio-nexa/refs-aprobadas/julio-ap-04.png` y `julio-ap-08.png` (primera y segunda de rostro del MANIFIESTO).
- Motor: `pnpm ai:image` (gpt-image-2, edit, `high`), 1152×1440 nativo 4:5, sin reencuadre. Costo estimado USD 0,20.
- Prompt verbatim: `prompt.txt`. Conserva pose, mano, gesto, suéter, mascotas, fondo y luz; cambia rostro, barba, canas, gafas.
- `foto:validar`: lecho blanco 7,24 ✓ · b* 2,4 ✓ · cursores ✓ · sin banda de texto (pieza muda) · campo al margen ✗, igual que el original.
- Comparación: `cmp.jpg` (antes · después · referencia) y `face100.png` (rostro al 100 %).
- Estado: candidata, pendiente de aprobación del operador.

## M3 · Todos en ojo de pez (mismo día, mismo método)

- Fuente: `rondas/mascotas/M3-todos-ojo-pez-plate.png`. Refs: `julio-ap-04` + `julio-ap-08`. Prompt: `prompt-M3.txt`.
- Solo cambia el rostro de Julio (izquierda), con la misma perspectiva de ojo de pez; Nexa, mascotas, fotos impresas y oficina intactas.
- Salida: `M3-todos-ojo-pez-v2-plate.png` · comparación `cmp-M3.jpg`. Costo estimado USD 0,20. Estado: candidata.

## M4 · Logo 3D en el muro — rostro y cuerpo

- Fuente: `rondas/mascotas/M4-logo3d-equipo-plate.png`. Refs: `julio-ap-04` (rostro) + `julio-ap-11` y `julio-ap-03` (cuerpo). Prompt: `prompt-M4.txt`.
- Cambia rostro y complexión de Julio; conserva su camisa blanca, pantalón navy, cinturón, reloj, pose y gesto. Logo del muro sin redibujar (revisado a ojo: letras y nave intactas).
- Salida: `M4-logo3d-equipo-v2-plate.png` · `cmp-M4.jpg` · `face-M4.png`. Costo estimado USD 0,20. Estado: candidata.

## Lección 2026-09-26 (tarde): el injerto no sirve para el rostro de Julio

El operador rechazó tres rondas de injerto (v2 con 2 refs, v3 con 11 refs a escena completa, v6 recorte + ángulo):
el modelo «fuerza» la cara (la alarga, la agranda o la vuelve caricatura) y, con otra persona en cuadro, la retoca.
Lo que funcionó en J2 (v7): **regenerar la escena completa con el pipeline canónico** — ficha → `pnpm foto:prompt`
→ `pnpm foto:generar` (Sunburst) — con `identidad: [{ persona: julio, vista: 45-der }]` (el ángulo del set que
coincide con el giro), el polo piqué del kit como prenda puesta, la pose y el momento descritos con marcadores
(nariz apunta al borde, ojos siguen la mano) y la utilería declarada (tablet, cámara de cine top). Ficha y prompt en `v7/`.

- J2 v8: la v7 de tres cuartos marcado se leyó «de lado como un mono» (el giro empuja la boca y la mandíbula). Corrección
  del canon: **la cabeza casi no gira, giran los ojos** — identidad frontal, marcadores del casi-frontal y sólo los iris
  hacia la mano. Evitar tres cuartos marcados y perfiles de Julio en escena.
