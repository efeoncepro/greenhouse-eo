# QA — «Formato Chile» v2 (2026-09-25)

Estado: **revisada por el agente** · no aprobada por el operador · no programada.

## Archivos y procedencia
- Final: `out/formato-chile-4x5-v2.png` (1080×1350 PNG). Vista 390: `out/preview-390/formato-chile-4x5-v2.png`.
- Plate: `plates/plate-v1-1.png` (gpt-image-2, 1600×2000, high, prompt `prompts/plate-v1.txt`; 2 variantes,
  ≈USD 0,58). v1-2 descartada: prueba 16:9 sin sujeto y diseñador tapándola.
- Capa gráfica: `pnpm foto:componer piezas.json` (Bricolage entrada/dominante/remate, selección AXIS
  eight-handles sobre el banner, logo SVG oficial `logo-negative` 20 % del lado corto). Métricas en `out/qa.json`.

## Cinco revisiones
| Nivel | Resultado |
|---|---|
| Estratégica | Trend vigente (pico 22–25 sep); ventana hasta ~27 sep. Aporta la lectura que ninguna marca mostró: recomponer en vez de estirar. |
| Creativa | Mecanismo contraste + demostración. Se entiende sin titular a nivel escena (pruebas en formatos + banner absurdo); el titular fija el chiste. |
| Cultural | Autoironía chilena compartida; sin mapa (evita error cartográfico); sin símbolos patrios. |
| Marca | Oficio de agencia visible (multiformato, dirección de arte); logo exacto, contraste 14,25:1; naranja de acento en «Chile» y abrigo. |
| Producción | 100 %: figura del banner con proporciones normales, pruebas coherentes, sin texto/logos inventados, mano y tablet correctos. Caja de selección ajustada al banner en v2. |

## Accesibilidad (WCAG 2.1 AA aplicable a imagen estática)
| Elemento | Ratio | Requerido | |
|---|---|---|---|
| Entrada | 20,25:1 | 4,5:1 | ✅ |
| Dominante | 19,74:1 | 3:1 (grande) | ✅ |
| Acento «Chile» (naranja) | 6,65:1 | 3:1 | ✅ |
| Remate | 18,8:1 | 4,5:1 | ✅ |
| Logo | 14,25:1 | 3:1 | ✅ |

- Jerarquía: dominante 198 / entrada 50 = 4,0× (regla ≥3×).
- 390 px: entrada ≈12 px, legible; la figura del banner es pequeña (≈12 px) pero se distingue.
- 1.1.1: texto alternativo en `COPY.md`. Teclado/foco/ARIA: no aplica (imagen estática).

## Límites declarados
- El banner visible mide ≈1:13 en cuadro; el «1:24» (4.270 km / 177 km promedio) va sólo en el caption, no en la imagen.
- Imagen generada con IA: declarar etiqueta de IA al programar (IG/Threads).
- Sólo 4:5. 9:16 no producido.
