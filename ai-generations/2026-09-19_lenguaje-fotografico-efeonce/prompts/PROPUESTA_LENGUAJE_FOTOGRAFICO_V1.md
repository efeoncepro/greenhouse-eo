# Lenguaje Fotográfico Efeonce — Propuesta V1 (post revisión adversarial)

> Estado: PROPUESTA, no aprobada. 2026-09-19. Reemplaza a V0. Veredicto adversarial sobre V0: «se sostiene con cambios».
> Alcance: foto e imagen fotorrealista de la marca propia de Efeonce. Fuera: clientes, ilustración, 3D, trendjacking con estética ajena.
> Piezas ya aprobadas (p. ej. «¿Claude o Codex?») NO se re-gradúan retroactivamente.

## 1. La firma = color sobrio + dirección de arte (no sólo un filtro)

Un tinte de color solo es copiable y no sobrevive a la recompresión. La firma combina tres cosas que deben aparecer juntas:

1. **Grade «Navy Shadow»**: negros nunca neutros, levantados y desviados hacia el tono del navy de marca
   (`#023c70` = L\* 25, a\* +5,0, b\* −34,7, h 278°, verificado). Hacia azul con leve violeta, **nunca a cian/teal**.
2. **Un bloque navy de marca en escena** (prenda de la cápsula o un objeto), separado de su fondo por ΔL\* ≥ 12.
3. **Luz práctica ámbar/tungsteno** cuando la escena lo permita. Nunca naranja saturado (el `#ff6500` es de Reach).

## 2. Invariantes (5, aplican a todo registro)

| # | Invariante | Medible |
|---|---|---|
| I1 | Grade Navy Shadow (lo aplica sólo el grade, no el prompt) | sombras neutras (L\* < 25, C\* < 14): a\* +1…+4, b\* −9…−4; p1 luminancia ≥ 16/255; altas luces b\* 0…+6; croma mediano ≤ 22 excluyendo azules de marca (h 255–295) |
| I2 | Luz motivada y direccional, lateral suave, key/fill ~3:1 | revisión humana |
| I3 | Textura real: grano fino en post (σ 3–4/255 para social, validado sobre la re-subida), piel y tela con detalle | revisión 100 % |
| I4 | Casting y actitud de trabajo real, casting diverso, mirada mayormente fuera de cámara | revisión humana |
| I5 | Veracidad y lugar: Santiago/LatAm específico; pantallas sin datos inventados legibles; consentimiento de personas reales; declarar IA donde aplique | revisión humana |

Anti-direcciones: teal-and-orange, synthwave, HDR, negros aplastados, neón, piel plástica, bokeh con halos, gran angular deformante, oficina stock.

## 3. Variables por registro (antes eran invariantes y se contradecían)

| Registro | Óptica | Profundidad de campo | Reserva de texto | Navy en escena |
|---|---|---|---|---|
| Retrato de oficio | 85–135 mm | f/1,8–2,8, gradiente sujeto/fondo ≥ 10× | tercio libre si va a social | prenda |
| Mesa de trabajo | 50–85 mm | f/2,8–4 | tercio superior si va a social | prenda u objeto |
| Espacio / evento | 35–50 mm | f/4–8 | opcional | ambiente, stand |
| Estudio de marca | 85–100 mm macro | variable | según formato | fondo navy (excluido de la medición) |

Libertad: 20–30 % de piezas pueden salir del registro (nocturno, alto contraste) para evitar el efecto «filtro».

## 4. Mecanismo

1. **Prompt = captura neutra.** El bloque LOOK (`efeonce-look-v1.prompt.txt`) pide color neutro y «NO color grade»; describe luz, textura, actitud y lugar.
2. **Grade = único dueño del color** (`efeonce-look.mjs grade`). Pendiente V2: normalizar balance/exposición antes del tinte (hoy un plate que ya viene frío se pasa: ej. 2 b\* −9,3).
3. **Check = sólo advertencia al inicio** (`efeonce-look.mjs check`); bloqueante cuando esté calibrado con ≥ 20 piezas aprobadas.
4. **Golden frames** sólo para luz y composición, nunca como referencia de paleta (evita doble grade).
5. **LUT para Capture One/DaVinci** recién cuando haya sesión real agendada. Un LUT no replica la protección de piel: en video, normalizar por toma + LUT base + qualifier de piel. Foto y video quedan emparentados, no idénticos.

## 5. Prueba de reconocimiento (corregida)

- Distractores coherentes: 2 marcas ficticias con su propio grade consistente (no stock heterogéneo).
- Línea base antes del lanzamiento y otra medición tras 3–6 meses de exposición.
- n ≥ 100 del público objetivo; atribución espontánea a «Efeonce» contra el azar (33 % con tres marcas).
- Hasta pasarla: «sistema consistente», no «activo distintivo».

## 6. Decisiones abiertas para el operador

- ¿Intensidad del grade? (los ejemplos V1 son sutiles: se nota lado a lado, no suelto).
- ¿El verde `#6EC207` queda excluido de la fotografía?
- ¿Dueño de la pieza: design-studio + versión del bloque LOOK?
