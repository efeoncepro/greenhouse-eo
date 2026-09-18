# Julio con Clawd y Codex en los hombros (2026-09-17)

Pieza pedida por el operador: él con **Clawd en un hombro y Codex en el otro** —las mascotas 3D de los partners que
produjimos en este mismo repo— y una expresión creíble de «¿qué hago?».

## Piezas

| Archivo | Qué cambia |
|---|---|
| `out/hombros-v01.png` | Las dos figuras **apoyadas con firmeza**, de cara a la cámara; Clawd con un brazo alzado hacia su oreja |
| `out/hombros-v02.png` | Las dos **giradas hacia él**, discutiéndole al oído; mejor lectura del chiste, contacto más liviano |

Ambas 1152 × 1440 (4:5), `gpt-image-2.5-sunburst` xhigh, ~USD 0,14 cada una.

## Referencias pasadas

Orden: mascota → mascota → prenda → persona.

1. Clawd: `2026-09-17_clawd-poses-3d/final/` — héroe de frente + (v01) idea tres cuartos / (v02) espalda tres cuartos
2. Codex: `2026-09-17_codex-poses-3d/final/` — héroe de frente + (v01) saludo tres cuartos / (v02) espalda tres cuartos
3. Polo navy: `2026-09-17_polo-efeonce/final/efeonce-polo-navy-01-frente-…`
4. Persona: `2026-09-17_equipo-vestuario/refs/julio-reyes-01.png` (rostro) + `julio-reyes-07.png` (cuerpo entero)

## Reglas que se aplicaron

1. **La vista que se pasa cambia hacia dónde mira la figura.** Con el héroe de frente + un tres cuartos frontal, las
   mascotas salen mirando a la cámara. Con la vista de **espalda tres cuartos** salen giradas hacia él. La referencia
   fija la forma, pero también arrastra el punto de vista: elegirla por la orientación que se quiere.
2. **Escala anclada a un objeto del cuadro:** «cada figura mide lo que su cabeza de mentón a coronilla». En
   centímetros el modelo las dibuja de cualquier tamaño (misma clase de error que las gorras y el emblema bordado).
3. **Integración física declarada:** la tela se hunde bajo cada figura, cada una proyecta sombra de contacto sobre el
   hombro y el pecho, y ambas comparten la luz y la profundidad de campo de la escena. Sin esto quedan pegadas encima.
4. **Expresión descrita por sus componentes, no por su nombre.** «¿Qué hago?» se pide como cejas levantadas y algo
   juntas, arrugas suaves en la frente, boca apenas abierta, cabeza inclinada unos grados, palmas hacia arriba a la
   altura de la cintura, hombros apenas alzados — y **explícitamente**: «no un encogimiento de hombros de caricatura».
   Pedir la emoción por su nombre devuelve una mueca.
5. **Persona real:** rostro + cuerpo entero, lente 135 mm, cámara a la altura del pecho y anatomía declarada
   (cabeza ≈ 1/7,5 de la altura). Fotos entregadas por él mismo; ninguna persona real se genera sin su consentimiento.

## Qué mirar al revisar

Las mascotas son marca ajena: Clawd es **cubos mate naranja terracota** con dos ojos rectangulares oscuros, brazos y
patas de cubo; Codex es **vinilo azul** con cabeza de nube, pantalla oscura con el prompt `>_` en cian y un `>_`
blanco en el pecho. Se revisan con recorte al 100 %: en la vista completa un cubo de más o un `>_` mal dibujado no se
ve. El emblema del polo se revisa igual — nave a la derecha, aletas abajo a la izquierda.
