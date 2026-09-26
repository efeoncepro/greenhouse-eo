# Prueba individual: Nexa en dirección de luz de rodaje

## Preflight visual completado

Se abrieron a tamaño completo la hoja `rondas/personas/julio-nexa-firmadas.jpg`, la serie `rondas/curado/set-curado-12.jpg` y los finales individuales `N1-ojo-pez-final.png`, `N1b-ojo-pez-plate.png` y `N2-reflejo-final.png`. También se abrieron las tres referencias canónicas de identidad. Frente a N1/N1b y N2, esta prueba conserva cejas, pelo oscuro ondulado, rostro y mirada concentrada, y cambia la mesa/vidrio por una decisión concreta de luz en rodaje.

Ficha: `ficha.json` → `prompt.txt`; segunda dirección `ficha-v2.json` → `prompt-v2.txt` mediante `pnpm foto:prompt`. Se retiró del prompt compilado la oración genérica de casting latinoamericano por el bloque específico de identidad de Nexa, según §3.1.1 del pipeline. El plate se generó sin texto ni logo, con las tres referencias canónicas. La v3 es una edición puntual del naranja sobre el plate v2, usando `edicion-v3.txt` y las mismas referencias de identidad. La firma se compuso después desde el SVG oficial con `LOGO=0.20`.

## Resultado medido

| Plate | Azul activo | Naranja activo | Lecho blanco | Firma |
| --- | ---: | ---: | ---: | ---: |
| v1 | 5,7 % | 0,09 % | 5,36:1 | Sin firmar |
| v2 | 4,7 % | 0,06 % | 7,12:1 | Sin firmar |
| **v3 elegido** | **4,7 %** | **1,42 %** | **7,06:1** | **Blanca, 18,96:1** |

`metricas.cjs` sobre v3: quemado 0,24 %, aplastado 0,9 %, contraste 84, b* de sombras 0,2 y piel L/C 50/24. El azul está en el panel que ilumina la toma; el naranja está en pinza y contrapeso del mismo rig de seguridad, ambos parte del oficio.

`pnpm foto:validar` reporta **2/4 reservas cumplidas** y exit 1 en v3: pasan lecho y sombras neutras; fallan aire lateral para cursores y campo profundo al margen. No se planificaron cursores ni texto en esta prueba; no la usaría como base de una pieza con selección colaborativa sin nueva toma. La reserva óptica del lecho muestra nitidez 0,0004 y el SVG queda sobre materia real oscura desenfocada. La detección de lecho aparece como «señal débil» en el validador, por lo que el blur se revisó visualmente en el plate completo.

Revisión visual: identidad de Nexa consistente con N1/N2 y referencias; vestuario crudo/grafito, sin navy; obra, mecanismo y momento claros; sin marcas ni texto legible. La v3 cambia levemente píxeles de toda la escena, aunque la identidad y composición se mantienen visualmente. Estado: **prueba para revisión del operador**, sin publicación.

Archivo para revisar: `final-v3.png`. Plate sin firma: `plate-v3.png`.
