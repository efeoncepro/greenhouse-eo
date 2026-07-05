# 03 · Tipografía COMO elemento visual

> **Borde claro, léelo primero.** Este módulo es el **rol VISUAL del tipo** en dirección de
> arte: tipo como imagen, headline art, lockups, jerarquía en un poster/KV, tipo sobre foto.
> Las **decisiones finas** — qué peso/variante, escala exacta, tracking, leading, kerning,
> numerales, opsz, pairing a nivel craft — son de **`typography-design`**. Acá diriges el ARTE;
> allá se define el CRAFT. Cuando la duda sea "qué peso/variante/tracking", **delega y para**.

> **Frescura.** Fundamentos de tipo-como-imagen = estables. Kinetic type y qué display domina
> el año = volátiles → `(as-of 2026-07 — reverificar)`.

---

## 1. Tipo como imagen (no como texto que se lee)

- En dirección de arte el tipo puede ser el **sujeto visual**, no solo el vehículo del mensaje:
  la forma de las letras, su masa, su textura y su recorte **son** la composición.
- Modos de usar tipo como imagen:
  - **Escala extrema**: una palabra que ocupa el 80% del lienzo → impacto puro.
  - **Recorte/bleed**: letras que salen del marco → energía, sensación de que no cabe.
  - **Tipo como textura**: repetición de palabras/caracteres formando un campo.
  - **Tipo + máscara**: la palabra encuadra o revela una imagen dentro de su contorno.
  - **Distorsión/inflado/líquido** `(tendencia as-of 2026-07 — reverificar)`: display glassy,
    waxy, cromado, 3D — con intención de marca, no como filtro gratuito.
- Regla: si el tipo es el héroe, **una sola palabra/idea** lo es. Todo lo demás se subordina.

## 2. Headline art

- El headline es la primera lectura y muchas veces la única. Tratamiento como pieza gráfica:
  - Rompe la línea con intención (dónde corta cada línea comunica ritmo y sentido).
  - Mezcla pesos/tamaños dentro del mismo headline para marcar la palabra clave.
  - Juega figura-fondo entre el texto y la imagen (§4).
- **Line breaks se diseñan, no se dejan al motor.** Un headline nunca corta dejando huérfana
  una preposición ni parte un nombre propio. (El wrap fino/`text-wrap: balance` → `typography-design`;
  acá decides la INTENCIÓN del quiebre.)

## 3. Lockups (logo + tagline / bloque de marca)

- Un **lockup** es la unión bloqueada de logo + tagline (o logo + descriptor) con relación
  espacial fija: proporción, alineación y aire definidos que **no se recomponen** al vuelo.
- Reglas de dirección:
  - Relación de tamaño estable logo↔tagline (define una proporción y respétala en todos los
    formatos → escalabilidad, ver `modules/04`).
  - **Zona de protección** (clear space) alrededor: nada invade ese aire.
  - Alineación clara (misma óptica izquierda, o centrado deliberado).
  - Versiones por formato: horizontal, apilada, reducida — el sistema, no una sola forma.
- **Efeonce ≠ Greenhouse** y `AxisWordmark` es **solo interno** — nunca lo metas en marketing,
  login, PDFs ni portal cliente (regla de marca del overlay). Logo real de tercero →
  `greenhouse-digital-brand-asset-designer`, nunca dibujado de memoria.

## 4. Tipo + imagen (contraste, legibilidad, cajas/scrims)

Es el problema recurrente. Solución en dos capas — **visual** (acá) y **contraste medible**
(ver `modules/02 §8`):

| Situación | Movida de dirección de arte |
|---|---|
| Foto uniforme | Ubica el texto en la zona plana; nada más hace falta |
| Foto variada | **Scrim** o **gradiente de scrim** solo bajo el texto |
| Máximo sistema/legibilidad | **Caja/lockup** de color opaco detrás del texto |
| Conservar color de la foto | **Blur/lens blur** local bajo el texto |
| Refuerzo de borde | Halo/sombra sutil (nunca como solución única sobre foto compleja) |

Contraste texto↔fondo debe cumplir **WCAG ≥ 4.5:1** (normal) / **≥ 3:1** (grande) medido sobre
la zona real (ver checklist de `modules/02`). Legibilidad no es negociable aunque el tipo sea
"arte".

## 5. Jerarquía tipográfica en un poster / KV

Estructura mínima de lecturas (el ojo entra por una, no por cuatro):

1. **Kicker / eyebrow** (contexto, chico) — opcional.
2. **Headline** (el golpe; nivel-1 de la composición).
3. **Subhead / bajada** (aclara).
4. **Body / detalle** (fecha, lugar, condiciones).
5. **CTA / cierre** (acción).
6. **Legal / créditos** (mínimo legible).

Reglas de dirección: **un** nivel-1; salto de tamaño claro entre niveles (contraste de escala,
no escalones tímidos); agrupa por proximidad (`modules/01 §3`); alinea todo a un eje. Los
**valores exactos** de escala (ratio, px, leading) los define `typography-design`.

## 6. Pairing a nivel dirección de arte

- Acá decides el **rol y el carácter** de las familias, no el kerning:
  - **Contraste de carácter**: display expresivo para el headline + neutra legible para el body.
    El contraste (no la similitud) es lo que se lee como intencional.
  - **Una voz de personalidad** por pieza — no dos display peleando.
  - Coherencia con la marca (para Efeonce, las familias reales viven en el SoT de
    `typography-design`: display + text; acá no inventas una fuente para la UI).
- El **cómo emparejar bien** (superfamilias, ejes variables, x-height, match óptico) es craft de
  `typography-design`. Si la pregunta es "¿qué dos fuentes?", delega.

## 7. Tipografía expresiva / display `(volátil as-of 2026-07 — reverificar)`

- Vigente: display con carácter fuerte, serifas dramáticas de alto contraste, grotescas anchas,
  y tratamientos táctiles (cromado, glassy, inflado, mixed-media). Úsalo como **firma de marca**,
  con moderación: display expresivo funciona porque el resto es sobrio.
- Antipatrón: cada texto en una fuente distinta "porque se puede" → caos sin jerarquía.

## 8. Kinetic type `(tendencia fuerte as-of 2026-07 — reverificar)`

- La identidad 2026 se concibe **con movimiento**: el tipo entra, respira, se reordena. En
  dirección de arte defines el **concepto cinético** (qué hace el tipo y por qué); la
  **implementación** (curvas de easing, duración, técnica, `prefers-reduced-motion`) es de
  **`motion-design`**.
- Entrega el concepto como storyboard/intención en el brief, no como código.

## 9. Tipo en distintos formatos

- El mismo mensaje vive en poster vertical, banner horizontal, story 9:16, thumbnail, print.
  El sistema tipográfico debe **degradar con gracia**: en thumbnail solo sobrevive el headline;
  en print importa el detalle fino. Diseña la jerarquía para el peor caso (thumbnail) y el mejor
  (print) a la vez.
- **Safe zones** por formato (redes, print bleed) y legibilidad mínima → specs en `modules/10`.

---

## Checklist — texto legible sobre imagen

- [ ] Contraste **WCAG ≥ 4.5:1** (normal) / **≥ 3:1** (grande) sobre la zona real bajo el texto.
- [ ] Texto ubicado en zona plana O con scrim/gradiente/caja/blur — no solo sombra.
- [ ] Legible en el peor formato (thumbnail comprimido) y en dark mode del cliente.
- [ ] Line breaks diseñados: sin huérfanas, sin partir nombres propios ni preposiciones colgando.
- [ ] **Un** nivel-1 tipográfico; salto de escala claro entre niveles.
- [ ] Craft fino (peso/variante/escala/tracking/leading/pairing) delegado a `typography-design`.
- [ ] Marca correcta: Efeonce ≠ Greenhouse; `AxisWordmark` solo interno; logos de tercero vía
      `greenhouse-digital-brand-asset-designer`.
- [ ] Kinetic type: concepto definido acá, implementación delegada a `motion-design`.

## Diagnóstico rápido — tipo mal dirigido

1. ¿Cuántas voces de display compiten? >1 = subordina todas menos una.
2. ¿Se lee el headline en 1 segundo a tamaño thumbnail? No = falta contraste de escala o el
   fondo se lo come (scrim).
3. ¿El texto flota sin alinear a nada? Alinéalo a un eje (`modules/01 §2`).
4. ¿La pregunta real es de peso/variante/escala exacta? → **para y delega a `typography-design`**.
