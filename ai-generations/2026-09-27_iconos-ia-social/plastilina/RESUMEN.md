# Plastilina · 10 íconos de IA, social y staff augmentation — CANDIDATOS (sin alta)

Fecha: 2026-09-27. Método: `docs/agent-composition/iconography.md` de AXIS, §«Un glifo nuevo de Plastilina».
Estado: **candidatos para aprobación del operador**. No se modificó ningún archivo de AXIS (`git status` limpio). El
alta a `PLASTILINA_GLYPHS` la hace otra persona tras la aprobación. Encargo original: 6 glifos; el operador sumó 4
más en la misma corrida (galeria, biblioteca, hoodie y gorra) y subió el tope a 4 hojas. Se usaron 3.

## Cómo se hizo

- 3 hojas 3×3 con `pnpm ai:image --model gpt-image-2 --quality high --size 1024x1024` y la referencia de estilo de
  AXIS. El prompt es el modelo canónico cambiando sólo `{{OBJETOS}}` (`prompt-A.txt`, `prompt-B.txt`, `prompt-C.txt`).
  - `hoja-A.png`: los 6 primeros + segunda variante de prompt, barra de búsqueda y aro de luz.
  - `hoja-B.png`: galería, biblioteca, hoodie y gorra (×2 cada uno) + aro de luz visto en ángulo.
  - `hoja-C.png`: 3 variantes de prompt, 3 de biblioteca y 3 de aro de luz.
  - Costo aprox.: 3 × USD 0,21.
- Forma de las prendas: se usaron como referencia visual (sólo de forma, sin pasarlas al modelo) las vistas de frente
  y lateral de los kits `Gorra Efeonce` y `Hoodie Efeonce` (OneDrive `5. Contenidos/13- Branding/`): gorra de seis
  paneles con botón y visera curva; hoodie con capucha, cordones y bolsillo canguro. **Sin logo ni texto dibujado**.
- Vectorizado con `node scripts/icons.mjs vectorize` (salidas en `vector-A/`, `vector-B/`, `vector-C/`).
- Posiciones de la esfera probadas en `pruebas/` (hojas `revision-pruebas-1/2/3.png`). Candidatos en
  `tools/candidatos.json` → `tools/finalize.mjs` → `final/<clave>.json`.
- Verificado con `node scripts/icons.mjs check` → `control/<clave>/` (160, 64 y 32 px, oscuro y papel; log en
  `check.log`). **Los 10 pasan las reglas medibles** (exit 0, área dentro del set, sin calados empastados).
- Revisión de familia: `familia-respuesta.png` y `familia-reposo.png` (arriba los 33 aprobados, exportados de AXIS a
  `aprobados-ref/` sólo para comparar; abajo los 10). Controles apilados: `revision-final-oscuro.png`, `revision-final-papel.png`.

## Los 10

| Clave | Label | Use | JSON final | Variante | Área | Esfera |
| --- | --- | --- | --- | --- | --- | --- |
| chispa | Chispa | inteligencia artificial, IA generativa, ideas | `final/chispa.json` | A-1 | 522 u² | en la chispa chica (35.2, 11.6): la chispa que se enciende. La estrella tiene la esfera al centro; así no se confunden |
| prompt | Prompt | prompt, composer, conversación con IA | `final/prompt.json` | A-7 (tarjeta con dos líneas y botón que sobresale) | 560 u² | en el botón de enviar (32.16, 29.49); en reposo se ve la flecha |
| barra-busqueda | Barra de búsqueda | búsqueda, buscadores, respuestas de IA | `final/barra-busqueda.json` | A-3 | 560 u² | en el lente de la lupa (12.83, 26.57) |
| aro-de-luz | Aro de luz | influencers, creadores, contenido en vivo | `final/aro-de-luz.json` | B-5 (en ángulo, con pie) | 559 u² | en el aro, arriba a la derecha (30, 5.8): la luz. El teléfono sigue a la vista |
| television | Televisión | medios, prensa, noticias | `final/television.json` | A-5 | 528 u² | centro de la pantalla (22.94, 27.05), como laptop y escritorio |
| like | Me gusta | redes sociales, reacciones, comunidad | `final/like.json` | A-6 | 560 u² | dentro del corazón calado (23.76, 21.41) |
| galeria | Galería | multimedia, fotos y video, contenido | `final/galeria.json` | B-1 (foto con play) | 560 u² | el sol de la foto (25.79, 16.05); el play queda visible |
| biblioteca | Biblioteca de assets | assets creativos, archivo, entregables | `final/biblioteca.json` | C-5 (carpeta con tarjetas asomando) | 560 u² | en el calado de la tarjeta de adelante (29.48, 17.98): la pieza |
| hoodie | Hoodie Efeonce | staff augmentation, talento, equipo en terreno | `final/hoodie.json` | B-3 (de frente, algo girado) | 560 u² | en la capucha (25.41, 14.93): la persona que lo lleva |
| gorra | Gorra Efeonce | staff augmentation, equipo en terreno, merch | `final/gorra.json` | B-4 (de lado) | 559 u² | en el panel frontal (23.2, 20.4), donde iría la marca |

Área = «área visible» que informa `icons:check` (set aprobado: 394–559). Ninguno lleva gesto (`gesture: []`) ni
`over`. Los JSON conservan `area`, `holes` y `source` como trazabilidad: en el alta se copian `label`, `use`, `t`,
`d`, `dot`, `over` y `gesture`.

## Dudas para el operador

1. **Prompt.** Es el más difícil: en respuesta, la esfera tapa la flecha de enviar. Las variantes en píldora (A-2, C-2)
   se leen como un **interruptor** con la esfera en la punta; la C-1 (caja con una línea) se lee como una **tarjeta de
   crédito**; la C-3 (con el botón colgando abajo) es un **globo de diálogo** y chocaría con «comentar». Se eligió A-7
   (tarjeta con dos líneas y el botón sobresaliendo de la esquina); igual puede leerse como «mensaje». Alternativas en
   `pruebas/ctl/`.
2. **Hoodie y gorra: la esfera no sigue la misma lógica.** En el hoodie va en la capucha (se lee «la persona que se
   suma», es lo más legible a 32 px); en la gorra va en el panel frontal, donde iría la marca. Probados y descartados:
   gorra en el **botón** (`pruebas/ctl/gorra-boton`: se lee como pompón, pierde el anillo porque cae en el borde),
   hoodie en el **cordón** (`hoodie-cordon`: se ensucia con los cordones) y en el **pecho** (`hoodie-pecho`,
   `hoodie-pecholado`: consistente con la gorra pero menos claro). Si prefiere la regla «la esfera va donde va la
   marca» en los dos, el hoodie pasa al pecho.
3. **Aro de luz.** Las variantes de frente (A-4, A-9, C-7, C-9) son simétricas y se descartaron; la de mano (C-8) se lee
   como lupa o espejo. La elegida lleva la esfera en el aro (la luz); con la esfera en el teléfono (`aro-telefono`) el
   teléfono se pierde a 32 px. A 32 px el teléfono ya es sólo una mancha: el aro se sostiene por la silueta.
4. **Chispa.** Con la esfera en la chispa chica, sus puntas quedan alrededor del anillo y a tamaño grande puede leerse
   como un átomo. La alternativa (esfera al centro, `chispa-centro`) se parece más a **estrella**. Aun así, chispa,
   estrella y varita no deberían ir en el mismo grupo.
5. **Galería y biblioteca** se parecen (tarjetas con calado redondo). Galería se distingue por la montaña y el play;
   la biblioteca C-4 (carpeta con foto y lápiz) se descartó porque con la esfera en la foto repetía la galería, y la B-2
   (sólo carpeta) porque con la esfera al centro se leía como una **cámara**.
6. **Televisión** y **medios** (Trazo) hablan de lo mismo en voces distintas; **barra de búsqueda** y **búsqueda**
   (Trazo), igual. Claves distintas a propósito, como llamada y teléfono.
7. **Gestos:** ninguno dibujado (son opcionales). Candidatos si alguno va de protagonista: chispa (destellos), aro de
   luz (rayos hacia adentro), televisión (ondas en las antenas).

## Archivos

- Hojas: `hoja-A.png`, `hoja-B.png`, `hoja-C.png` · prompts: `prompt-A.txt`, `prompt-B.txt`, `prompt-C.txt`
- Vectores crudos: `vector-A/`, `vector-B/`, `vector-C/` · contactos con grilla 48: `contacto-A/B/C.png`
- Finales: `final/` · control: `control/<clave>/` · `check.log`
- Pruebas de esfera: `pruebas/` y `pruebas/ctl/`, revisadas en `revision-pruebas-1/2/3.png`
- Familia: `familia-respuesta.png`, `familia-reposo.png` · `aprobados-ref/`: export de AXIS (no entregable)
- `tools/`: scripts de apoyo (contacto, dotfit, extremo, stack, probar, finalize, family)
