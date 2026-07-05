# 02 · Color en imagen

> **Estable en la base, volátil en el borde.** Teoría del color, armonías, contraste y
> accesibilidad son **estables** (no reverifiques). Lo volátil es qué **tendencia** cromática
> domina el año (gradientes, duotonos, surreal) — marca eso con `(as-of 2026-07 — reverificar)`.

> **Borde duro.** El color de **tokens de UI sale de AXIS** (SoT `axis-tokens.ts`) — este
> módulo NO define color de producto; para eso delega a `product-design-loop`/`modern-ui` y
> nunca transcribas HEX crudo de una imagen a la UI. El color de **charts** → `dataviz-design`.
> Acá el color como **dirección de arte de imagen** (KV, campaña, hero, poster).

---

## 1. Rueda y modelo mental

- Trabaja mentalmente en **HSL/HSB**: **Hue** (matiz), **Saturación** (pureza), **Value/Brightness**
  (luminosidad). Separar los tres es lo que distingue a un colorista de un aficionado.
- **Primarios/secundarios/terciarios** dan las relaciones; el trabajo real está en modular
  **S** y **V**, no solo en elegir H.
- Regla práctica: casi ningún problema de color se arregla cambiando el matiz — se arregla
  **bajando saturación** o **abriendo el rango de valor**.

## 2. Armonías cromáticas

| Armonía | Cómo se arma | Cuándo usarla |
|---|---|---|
| **Monocromática** | Un matiz, varía S y V | Elegante, sobrio, premium; foco en forma/luz |
| **Análoga** | 2–4 matices vecinos en la rueda | Cálido/coherente, natural, sereno; fondos, ambientes |
| **Complementaria** | 2 matices opuestos | Máximo contraste y vibración; acento vs base, CTA que grita |
| **Split-complementaria** | Un matiz + los 2 vecinos de su opuesto | Contraste fuerte pero menos tenso que el complementario puro |
| **Tríada** | 3 matices equidistantes | Vibrante y balanceado; ilustración, marcas jóvenes |
| **Tetrádica / doble-complementaria** | 2 pares complementarios | Rico pero difícil; requiere un matiz dominante que mande |

Regla del 60-30-10: **60%** color dominante, **30%** secundario, **10%** acento. El acento
es el que dirige el ojo — úsalo con avaricia. Complementarios: nunca 50/50 (vibran y cansan);
uno manda, el otro acentúa.

## 3. Temperatura, saturación, valor

- **Temperatura**: cálidos (rojo/naranja/amarillo) avanzan y energizan; fríos (azul/verde/
  violeta) retroceden y calman. Cálido sobre frío = sujeto salta del fondo (profundidad).
- **Saturación** como jerarquía: lo saturado atrae, lo desaturado retrocede. Un solo elemento
  saturado en un campo neutro = punto focal instantáneo. "Todo saturado" = nada resalta y da
  fatiga (error de amateur).
- **Valor** es el rey del contraste: la estructura de una imagen vive en su rango claro-oscuro.
  Si el value no funciona en B/N, ningún matiz lo salva (ver `modules/01 §8`).

## 4. Cómo construir una paleta (protocolo)

1. **Ancla en la marca / intención**: matiz base o el equity de color existente (Efeonce → AXIS
   como referencia de identidad, no como token literal de imagen).
2. **Elige una armonía** (§2) según el mood buscado.
3. **Define roles, no solo colores**: dominante (60), soporte (30), acento (10), + neutros
   (un claro y un oscuro que casi siempre faltan y son los que dan aire y anclaje).
4. **Modula S y V** para dar un rango: 1–2 versiones más claras/oscuras de cada rol.
5. **Verifica en gris**: convierte a escala de valor — la paleta debe tener contraste de value,
   no solo de matiz.
6. **Prueba en contexto real** (sobre foto/fondo), no en swatches aislados.
7. Cierra la paleta en `templates/campaign-visual-system.md` con roles + uso.

## 5. Duotono

- Mapea las sombras a un color y las luces a otro (no es "foto teñida", es remapeo de rango
  tonal). Reduce a marca, unifica material heterogéneo, se siente editorial/moderno.
- Elige un color oscuro para sombras y uno claro/saturado para luces; el contraste de **value**
  entre ambos define la legibilidad. Duotono con dos colores de value parecido = imagen barrosa.
- Uso típico: portadas, headers de campaña, tratar fotos de distinta calidad como un set.

## 6. Gradientes `(tendencia fuerte as-of 2026-07 — reverificar)`

- 2026 favorece gradientes ricos: mesh (multipunto), aurora, grano sobre gradiente, y
  transiciones dentro de un mismo matiz (analog glow) más que arcoíris planos.
- Reglas para que no se vea barato: (a) transición dentro de matices vecinos o del mismo matiz;
  (b) **agregar grano/ruido** rompe el banding y da textura táctil (rima con doctrina
  "imperfección/autenticidad"); (c) direccionalidad con intención (guía el ojo).
- Evita: gradiente de complementarios puros que pasa por gris/marrón muerto en el medio.

## 7. Color audaz / surreal `(volátil as-of 2026-07 — reverificar)`

- Paletas saturadas, combinaciones inesperadas y surrealismo cromático están vigentes — pero
  **con intención**, no por novelty. Un color audaz debe servir a jerarquía o emoción de marca,
  no ser un truco.
- Táctica segura: base sobria + **un** gesto audaz (un acento surreal). Todo audaz = ruido.

## 8. Contraste y ACCESIBILIDAD de texto sobre imagen

Cuando hay **texto sobre foto/color**, la legibilidad es requisito, no opción.

- **WCAG 2.x (ratio de luminancia)**: texto normal ≥ **4.5:1**, texto grande (≥24px o ≥19px
  bold) ≥ **3:1**. Es el piso legal/estándar.
- **APCA** (WCAG 3 en desarrollo, `as-of 2026-07 — reverificar`): modelo perceptual más fiel
  que pondera peso y tamaño; úsalo como criterio fino cuando el ratio WCAG "pasa" pero el texto
  igual se ve débil. No lo cites como norma cerrada todavía.
- El craft fino de tipografía (peso/variante/tracking para legibilidad) es de **`typography-design`**;
  acá resuelves el **problema visual**: separar texto de un fondo que varía.

Técnicas para ganar contraste texto↔foto (de menos a más invasiva):

| Técnica | Efecto | Cuándo |
|---|---|---|
| **Scrim/overlay** (capa oscura/clara semitransparente) | Aplana el fondo bajo el texto | Fondo muy variado; el más usado |
| **Gradiente de scrim** | Oscurece solo la zona del texto, preserva la foto | Hero editorial; menos "tapado" |
| **Caja/lockup sólido** | Texto sobre bloque de color opaco | Máxima legibilidad; look de sistema |
| **Blur local / lens blur** | Desenfoca el fondo bajo el texto | Cuando quieres conservar color de la foto |
| **Text shadow / halo sutil** | Despega el borde de la letra | Refuerzo, no solución principal |
| **Elegir la zona** | Ubicar texto donde la foto ya es plana/uniforme | Lo primero a intentar; gratis |

Regla: intenta primero **ubicar el texto en la zona plana**; si no alcanza, **scrim/gradiente**;
la sombra sola casi nunca basta sobre foto compleja.

## 9. Color como jerarquía y foco

- El acento (10%) es tu herramienta de foco: un solo color de acción/atención guía el ojo al
  CTA o al núcleo del mensaje. Si hay 3 acentos, no hay foco.
- Consistencia de color = reconocimiento de marca; reserva el matiz de marca para lo importante,
  no lo derroches en decoración.

## 10. Psicología de color aplicada a marca/campaña

Guía direccional (cultural, no ley — `as-of 2026-07`, y depende de cliente/mercado):

| Familia | Asociación frecuente | Nota de dirección |
|---|---|---|
| Azul | Confianza, tech, calma, corporativo | Sobreusado en B2B; diferénciate con matiz/tratamiento |
| Verde | Crecimiento, salud, dinero, sostenible | Cuidado con "eco-cliché"; el olivo tonal no siempre gusta |
| Rojo | Urgencia, energía, apetito, alerta | Potente como acento; agota como base |
| Naranja/amarillo | Optimismo, cercanía, económico | Cálido y accesible; legibilidad difícil en amarillo |
| Violeta | Creatividad, lujo, misterio | Premium o "beauty/tech" |
| Negro/neutros | Lujo, autoridad, minimalismo | El neutro correcto es lo que hace premium a lo demás |

Aplica psicología como **hipótesis direccional**, siempre validada contra la marca real y el
mercado del cliente (los clientes Globe son enterprise internacional → matices y connotaciones
cambian por región).

---

## Checklist — contraste de texto sobre foto

- [ ] El texto pasa **WCAG ≥ 4.5:1** (normal) / **≥ 3:1** (grande) sobre el punto más claro/oscuro
      del fondo bajo cada glifo (no el promedio).
- [ ] Verificado sobre **la zona real** del texto, no sobre un swatch plano.
- [ ] Si el fondo varía bajo el texto, hay scrim/gradiente/caja/blur — no solo text-shadow.
- [ ] Legible también en el peor caso (imagen comprimida, thumbnail, dark mode del cliente).
- [ ] El acento de color no compite con el color del texto por el foco.
- [ ] Craft fino de tipo (peso/tracking) delegado a `typography-design`; acá resuelto lo visual.

## Checklist — ¿la paleta funciona?

- [ ] Tiene roles definidos (dominante/soporte/acento + neutro claro y oscuro).
- [ ] Sigue una armonía coherente (§2), no colores sueltos.
- [ ] Balance 60-30-10; el acento es escaso.
- [ ] Tiene contraste de **value** (sobrevive en gris), no solo de matiz.
- [ ] Probada en contexto real (sobre foto/fondo), no en swatches.
- [ ] Alineada a la marca; para UI el color viene de AXIS (no de la imagen).
