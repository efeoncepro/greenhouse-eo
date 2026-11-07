# Fotografía editorial del Blog SKY

> Contrato: `brands/sky-airline/blog/contracts/sky-blog-photography.json`. Este archivo explica el porqué.
> Fuente: Skill de imágenes de Notion (D aprobado por Julio el 2026-10-06; E incorporado el 2026-10-08) y Spec Imágenes.

## 1. La función de cada foto

La imagen no ilustra el artículo: lo hace avanzar. Una foto = un momento concreto del artículo + una mirada de viajero
+ una función narrativa.

| Pieza | Pregunta | Nota |
|---|---|---|
| IMG 1 · portada 🔁 | ¿Dónde estoy? | Contexto, sin postal. Es el LCP y la base de og y cuadrado |
| IMG 2 | ¿Qué hago o qué decido? | Acción o decisión del relato |
| IMG 3 | ¿Cómo se siente o qué demuestra? | Se elige por argumento, no por belleza |

Máximo 3 por artículo, portada incluida. Si el artículo sólo da para dos, se entregan dos y se documenta. Variedad de
la tanda: al menos 2 tipos distintos, máximo un plano de destino puro y una selfie, al menos una con acción, persona o POV.

## 2. Estándar D (lenguaje común)

Lo que hace que una foto se lea «SKY blog»:

- **POV del viajero**: cámara desde una posición accesible durante el recorrido, foto espontánea de alguien que está ahí.
  No una toma externa del viajero posando, no dron.
- **Luz abierta**: exposición luminosa, sombras con detalle, altas luces conservadas. **La luz coincide con la hora y el
  clima del relato**: una garúa luminosa sigue siendo garúa. Abrir sombras no autoriza a inventar sol.
- **Color limpio**: natural, balance coherente, contraste moderado. Sin gris apagado, sin sobresaturación, sin HDR, sin
  filtro naranja-turquesa ni color de marca impuesto al paisaje.
- **Profundidad óptica real**: la nitidez cae con la distancia; el desenfoque nace del foco, no de un borrón pegado.
- **Personas espontáneas**: caminar, mirar, conversar, fotografiar. Sin poses ni miradas al lente; no hace falta que
  todos estén de espaldas o desenfocados.

Referencia: REF-ESTILO-D (Reloj de Flores de Viña con cantero de rosas desenfocado y visitantes). Es una imagen generada:
guía el lenguaje, no acredita geografía. Para el lugar, REF-01 real.

## 3. Registro D o E

| Registro | Conduce la foto | Cuándo |
|---|---|---|
| D · observación | El lugar o el detalle narrado | El ancla del artículo describe observar, descubrir o detenerse |
| E · experiencia | Una actividad compartida vista por quien participa | El ancla relata una acción vivida |

E **hereda todo** el acabado de D y suma:

- **Microescena** (completarla antes del prompt): quién hace qué, en qué instante, con qué apoyo u objeto, qué
  consecuencia visible produce, hacia qué dirige su atención y qué hace y dónde está quien fotografía. Una acción por
  imagen, en un momento intermedio; compañeros con agencia (no se vuelven meseros por sostener un vaso).
- **Mirada con objetivo real**: cada persona relevante mira algo declarado (la ola, el siguiente paso, la ruta). Cabeza
  y ambos ojos visibles apuntan a ese objetivo y a su distancia. La corrección de una mirada fallida no es mirar al lente:
  es arreglar la relación con el objetivo.
- **Casting de lujo discreto**: adultos ficticios con aspecto cotidiano y cuidado; calidad expresada por confección y
  materiales, sin logos; vestuario individual y funcional, nunca coordinado de catálogo. La capacidad económica no se
  deduce de piel, edad ni facciones.
- **Piel**: natural, textura fina a la escala de la toma; sin plástico, sin cuadrícula de poros, sin microcontraste.
- **Acabado por material**: corregir el color dominante por material (menos cian en agua y cielo sin tocar la piel), no
  con desaturación global; transiciones suaves en altas luces.

Elegir E no autoriza a agregar una aventura, servicio, embarcación o compañero que cambie la spec.

## 4. Tipo A–H (qué muestra) ≠ registro D/E (cómo participa)

| Tipo | Registro habitual | Cuidar |
|---|---|---|
| A · Destino contextual | D | Landmark legible con REF real, no necesariamente centrado; sin postal vacía ni dron |
| B · Viajero integrado | D (E si participa) | Persona de espaldas, perfil o recortada; el destino no desaparece |
| C · Acción espontánea | E | Momento intermedio; contacto y consecuencia visibles |
| D · POV de recorrido | E | Señal corporal plausible (pies, mano en baranda, borde del kayak) |
| E · Mano, objeto o alimento | E | Mano al 100 %; sin texto inventado en mapas o boletos; sin packshot |
| F · Encuentro social | E | Interacción real; sin pose grupal |
| G · Pausa sensorial | D (E si es compartida) | Textura y luz anclada al artículo |
| H · Autorretrato editorial | E | Máximo uno por artículo; reflejo o recorte; sin rostro en primer plano |

«Tipo D · POV de recorrido» no es «registro D». El builder avisa (no bloquea) cuando el tipo va fuera de su registro
habitual: manda el ancla del artículo, y se registra.

## 5. Primer plano: decisión, no casilla

**Regla vigente (2026-11-02):** por defecto, cuando es plausible. El builder exige una de dos:

- `--primer-plano "<elemento real>" [--borde …]`: vegetación del lugar, borde del propio equipo, manga del viajero.
  Muy cerca del lente, muy fuera de foco, por un borde o esquina, ≤ ~12 % del cuadro, sin tapar rostro, manos, contacto
  ni el landmark.
- `--sin-primer-plano "<razón>"`: plaza abierta sin nada al alcance del lente, interior donde un objeto cercano sería
  forzado, etc. El prompt pasa a dos planos sin desenfoque artificial.

Por qué cambió (era «obligatorio» en Notion): la Spec misma ordenaba escalar si no era plausible, las pruebas del 08/10
no todas lo llevaban, y una regla absoluta empuja a inventar objetos («no repetir rosas por fórmula»). En **portada** el
primer plano entra por abajo (`heroEdges`): cae bajo el H1 y su masa tranquila ayuda a leer el texto.

## 6. Escribir el prompt

```bash
cd /Users/jreye/Documents/creative-workbench
node brands/sky-airline/blog/scripts/prompt-plate.mjs \
  --registro D --tipo A --portada \
  --lugar "Plaza Mayor de Lima, Cercado de Lima, Perú" \
  --escena "the Cathedral of Lima seen from the plaza garden, visitors walking spontaneously" \
  --hora "mid-morning" --clima "overcast sky with light garúa" \
  --primer-plano "a palm frond from the plaza garden" --borde "lower-left corner" \
  --ref-lugar "the Cathedral of Lima facade and its two towers" \
  --prohibir "readable shop signs on the arcades"
```

- Datos de escena, hora y clima salen de la spec: el builder falla si falta uno.
- E exige `--fotografo` y `--mirada`.
- `--json <archivo>` acumula entradas `{filename, prompt, record}` para un lote (`run.sh` por fila).
- El prompt va en inglés (así se ensayó el 08/10); la ficha y el registro, en español.

## 7. Motores

| Caso | Motor |
|---|---|
| Escena nueva sin referencia | `gpt-image-2.5-sunburst` («ChatGPT Images 2.5») |
| Lugar identificable con REF real | `gpt-image-2.5-sunburst` en modo edición (`--image` REF-01) |
| Corregir una pieza ya generada | `gpt-image-2.5-sunburst` en modo edición (edición dirigida) |
| Cambiar sólo una zona (alejar la cámara, borrar letras) | `gpt-image-2.5-flare` con máscara vía `pnpm ai:inpaint image`. Sunburst con máscara devuelve un panel negro |
| ~~Nano Banana Pro~~ | **Excluido** (Julio, 2026-11-05: «no tiene buena calidad»). Contrato: `engines.excluded` |
| Variantes de recorte | Ninguno: se recorta el maestro |
| Texto | Ninguno: el texto sólo existe en el banner de ruta, compuesto |

Hipótesis de arranque de Notion; se corrige con fecha cuando una pieza real lo demuestre. El motor y su versión se
registran desde el log del CLI; sin evidencia, no se atribuye. `pnpm ai:image` usa Flare por default desde el
2026-11-05: pasar siempre `--model gpt-image-2.5-sunburst` para una foto del blog.

**Colorimetría Brandlift.** Julio pidió el 2026-11-05 «recuerda la colorimetría de SKY, bokeh y demás». En el lote se
sumó al prompt (campo `extra` de `prompt-plate`) el bloque de la hoja 15 de Daniela Ferreira: POV del viajero a la
altura de los ojos, luz natural luminosa con sombras abiertas y blancos con detalle, color natural con ocres, azules y
piel fieles, contraste moderado, sin filtro, sin naranja-turquesa ni HDR, profundidad óptica real (lo cercano muy fuera
de foco con bokeh suave, el sujeto nítido) y momento espontáneo; más el lente por tipo (A, B, C y D 28–35 mm; E y G 50 mm;
F 35–50 mm). Vive en `projects/sky/blog-lote-2026-11/plates/brandlift.json`; todavía no está en el contrato.

## 8. Escenas IMG 2–3 desde las specs (lote)

En un lote, cada escena se convierte en una entrada de `prompt-plate` leída de su spec (`plates/escenas-img23.json`,
99 entradas el 2026-11-05):

- **Tipo** = la letra con que empieza el tipo de la spec (A–H). **Registro** D o E, de la spec.
- **E exige `fotografo` y `mirada`**: la frase de la spec «fotografía X, mirando Y» se separa en los dos campos.
- **Primer plano y borde** salen del texto de la spec (las 99 entradas del lote llevaron uno; si no es plausible, el
  builder acepta `sinPrimerPlano` con la razón).
- **`refLugar`** sale del texto de fidelidad de la spec («REF-01 de … en la tarea»). Si la escena exige REF y no hay
  una válida, queda bloqueada: el 2026-11-05 fueron 6 de 67 (amigos 2 y 3, asado alemán en cena chilena 2, picante a la
  tacneña en Tacna 3, cerámica Wayku en Lamas 3, poza de Baños del Inca en Cajamarca 3).
- Una escena puede reusar como REF la de la portada del mismo artículo cuando muestra el mismo lugar.
- Las escenas no pasan `medir-portada`: se muestran completas en el cuerpo. Sí pasan QA al píxel, retoque de letras y
  `exportar.mjs` sin `--portada`.

## 9. Ensayo del 2026-10-08 (registro E)

`gpt-image-2.5-sunburst`, calidad max, maestros 3840×2160, previews 1408×768 WebP < 200 KB
(`ai-generations/2026-10-08_sky-registro-e-prueba/`). Hallazgos que siguen vigentes:

- El acabado V02 (menos cian por material) mejora agua y roca sin desaturar la piel; mejora moderada.
- Los perfiles ocultan el ojo lejano: no se certifica la convergencia de ambas pupilas.
- Una edición generativa redibuja facciones, manos o arquitectura: repetir QA completo.
- La REF-ESTILO-D no estuvo accesible en píxeles: se aplicaron sus criterios escritos sin afirmar igualación.
- Aprobación del operador: pendiente. No son piezas publicables.
