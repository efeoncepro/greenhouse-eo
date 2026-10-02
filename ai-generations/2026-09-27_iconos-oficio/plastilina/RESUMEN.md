# Plastilina · 15 íconos del oficio — CANDIDATOS (sin alta)

Fecha: 2026-09-27. Método: `docs/agent-composition/iconography.md` de AXIS, §«Un glifo nuevo de Plastilina».
Estado: **candidatos para aprobación del operador**. Nada se escribió en el repo de AXIS; el alta a
`PLASTILINA_GLYPHS` la hace otra persona tras la aprobación.

## Cómo se hizo

- 3 hojas 3×3 con `pnpm ai:image --model gpt-image-2 --quality high --size 1024x1024` y la referencia de estilo de
  AXIS; prompt = el modelo canónico cambiando sólo `{{OBJETOS}}` (`prompt-A.txt`, `prompt-B.txt`, `prompt-C.txt`).
  - `hoja-A.png`: los 9 primeros.
  - `hoja-B.png`: los 6 restantes + segunda variante de encuadre, vinilo y escuadra.
  - `hoja-C.png`: variantes de película (×3), lápiz, varita y guitarra (×2 cada uno).
  - Costo aprox.: 3 × USD 0,21.
- Vectorizado con `node scripts/icons.mjs vectorize` (salidas en `vector-A/`, `vector-B/`, `vector-C/`).
- Esfera, label y use puestos en `tools/candidatos.json` → `tools/finalize.mjs` → `final/<clave>.json`.
- Verificado con `node scripts/icons.mjs check` → `control/<clave>/` (hojas a 160, 64 y 32 px, oscuro y papel).
  **Los 15 pasan las reglas medibles** (área dentro del set, sin gesto que validar, sin aviso de calados empastados).
- Revisión de familia a ojo: `familia-respuesta.png` y `familia-reposo.png` (arriba los 18 aprobados, abajo los 15).

## Los 15

| Clave | Label | Use | JSON final | Variante | Área | Esfera |
| --- | --- | --- | --- | --- | --- | --- |
| lapiz | Lápiz | boceto, escritura, idea en papel | `final/lapiz.json` | C-5 | 439 u² | en la punta, apenas fuera de la silueta (8.6, 41.4), como pincel y cuentagotas |
| rodillo | Rodillo | pintura, cobertura, gran formato | `final/rodillo.json` | A-2 | 491 u² | sobre el rodillo, donde pinta (26.8, 14) |
| aerosol | Aerosol | arte urbano, grafiti, intervención | `final/aerosol.json` | A-3 | 559 u² | en la boquilla (32.6, 7.4); reemplaza la tapa |
| escuadra | Escuadra | diseño técnico, grilla, precisión | `final/escuadra.json` | B-9 (sin marcas) | 506 u² | centro del calado triangular (19.85, 27.53) |
| postit | Post-it | ideación, taller, notas | `final/postit.json` | A-5 | 560 u² | en el cuerpo de la nota (22.8, 21.2), sin tapar la esquina doblada |
| encuadre | Encuadre | encuadre, composición, formatos | `final/encuadre.json` | B-7 (inclinado) | 560 u² | centro del marco (23.86, 24.19): lo que queda encuadrado |
| pelicula | Película | cine, fotografía analógica, rodaje | `final/pelicula.json` | C-1 (cartucho) | 560 u² | en el cuerpo del cartucho (19.2, 26.8) |
| vinilo | Vinilo | música, discografía, playlist | `final/vinilo.json` | B-8 (con etiqueta) | 560 u² | en el centro del disco (23.53, 23.38) |
| guitarra | Guitarra | música en vivo, composición, jingle | `final/guitarra.json` | C-9 (gorda, sin clavijas) | 546 u² | la boca (22.73, 24.47) |
| reproducir | Reproducir | video, estreno, reproducción | `final/reproducir.json` | B-1 | 560 u² | en la punta del triángulo (28.2, 24.4), no en su centro |
| varita | Varita mágica | magia, efectos, transformación | `final/varita.json` | C-7 | 409 u² | centro de la estrella (30.8, 12.8) |
| taza | Taza de café | pausa, conversación, equipo | `final/taza.json` | B-3 | 560 u² | en el cuerpo de la taza (20, 25.2) |
| lampara | Lámpara de escritorio | foco, estudio, trabajo creativo | `final/lampara.json` | B-4 | 559 u² | la luz: calado de la pantalla (30.92, 23.06) |
| trofeo | Trofeo | premios, logros, reconocimiento | `final/trofeo.json` | B-5 | 560 u² | en la copa (24, 20.4) |
| estrella | Estrella | destacado, favorito, calidad | `final/estrella.json` | B-6 | 560 u² | centro (23.2, 24.4) |

Área = «área visible» que informa `icons:check` (set aprobado: 394–559). Lápiz y varita quedan abajo porque son
alargados y manda el radio, como pincel y cuentagotas. Ningún candidato lleva gesto (`gesture: []`); todos llevan
`over: []`. Los JSON conservan `area`, `holes` y `source` como dato de trazabilidad: quien haga el alta copia sólo
`label`, `use`, `t`, `d`, `dot`, `over` y `gesture`.

## Dudas para el operador

1. **Aerosol.** El calado de la boquilla (r≈1,2) es mucho más chico que la esfera: la esfera se come la tapa y se
   lee como una tapa naranja arriba (parecido a los que llevan la esfera en la esquina: cámara, claqueta,
   micrófono). Alternativa: la esfera fuera, como la nube del spray junto a la boquilla.
2. **Película.** Se eligió el cartucho de 35 mm (C-1) y la esfera va en su cuerpo: sobre el carrete de arriba el
   anillo se mezclaba con la elipse y ensuciaba. Alternativa descartada: la bobina de cine (C-3, `vector-C/pelicula-c3.json`),
   que se lee bien pero se parece a la **paleta** (disco con calados redondos). Las perforaciones del cartucho son
   chicas: a 32 px apenas se leen.
3. **Reproducir.** La esfera en el centro del triángulo lo tapaba entero y a 32 px quedaba una mancha naranja en un
   círculo; en la punta el triángulo se sigue leyendo. Es un disco casi de frente (la inclinación la da el óvalo).
4. **Vinilo.** Óvalo bastante aplastado; en respuesta la esfera ocupa la etiqueta y se lee como disco con centro
   naranja. Puede leerse como CD. La variante A (`vector-A/vinilo.json`, con reflejos curvos) se descartó por
   parecer más CD todavía.
5. **Escuadra.** La variante A traía marcas de medida (calados de r≈0,9) que se empastan a 32 px; la B no las tiene
   pero queda más plana y más «de frente» que el resto del set.
6. **Varita y estrella** comparten la estrella: no ponerlas en el mismo grupo. En la varita el anillo de la esfera
   vacía la estrella hasta dejarla casi en contorno; la alternativa es la esfera en una punta de la estrella.
7. **Encuadre** es la herramienta de recorte (dos L cruzadas): convive con **tijeras** («edición, recorte»); por eso
   su `use` dice encuadre y composición, no recorte.
8. **Post-it:** la esquina doblada es un calado fino; a 32 px se ve débil pero se lee.
9. **Gestos:** no se dibujó ninguno (opcionales). Si alguno será protagonista, candidatos naturales: lámpara
   (rayos bajo la pantalla), taza (vapor), varita (destellos).

## Archivos

- Hojas: `hoja-A.png`, `hoja-B.png`, `hoja-C.png` · prompts: `prompt-A.txt`, `prompt-B.txt`, `prompt-C.txt`
- Vectores crudos: `vector-A/`, `vector-B/`, `vector-C/` · finales: `final/` · control: `control/<clave>/`
- Revisión: `contacto-1.png`, `contacto-2.png` (variantes con grilla), `revision-1a/1b/1c.png` (control oscuro),
  `revision-papel.png`, `familia-respuesta.png`, `familia-reposo.png`
- `aprobados-ref/`: export del set aprobado (línea brand) sólo para comparar; no es entregable.
- `tools/`: scripts locales de apoyo (hoja de contacto, punto interior, extremos, apilado, finalización).
