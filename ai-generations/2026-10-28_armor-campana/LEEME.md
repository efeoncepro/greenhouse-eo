# ARMOR EPPS — campaña de ejemplo en registro cinemático (28/10/2026)

Plates para anuncios de LinkedIn (1:1) de la propuesta a ARMOR EPPS (Indecaucho). Maqueta: no publicada.

- Modelo: GPT Image 2.5 Sunburst, `high`, 1536×1536, tres generaciones (≈ USD 0,12 c/u).
- Referencias de producto (`refs/`): fotos públicas de armorepps.com: máscara F680 puesta (agro), F680 de producto e inserto óptico.
- Prompts en `prompts/`: un plate por concepto, con la reserva de texto en el 45 % izquierdo.

| Plate | Concepto | Dolor |
| --- | --- | --- |
| `A-riesgo-invisible-v1` | «No se ven. Se respiran.»: el contraluz revela el vapor y el polvo | SSO: riesgo invisible y responsabilidad |
| `E-rosas-v1` | «Huele a rosas. Respira químicos.»: invernadero en Cayambe | Agro y floricultura: químico en un entorno que no parece peligroso |
| `L-lentes-v1` | «¿Usa lentes? Igual sella.»: inserto óptico dentro del visor | Operación: quien usa lentes no se protege bien |

QA al 100 %:
- La máscara es una aproximación de IA a la F680, no el producto exacto.
- Los cartuchos imitan el estilo de bandas de color de la categoría.
- Hay micro-texto ilegible en cartuchos y válvula.
- Ningún logo legible de terceros.

Antes de pautar:
- Fotografía real o render del producto exacto.
- Autorización de ARMOR.
- Certificados vigentes publicados.

## Ronda 2 — 28/10/2026 (aplicadas las nueve mejoras)

| Plate (2048² + 4:5 nativo) | Anuncio | Dolor |
| --- | --- | --- |
| `A2-no-se-ven-v2` + `-4x5-v2` | «No se ven. / Se respiran.» | Seguridad y Salud Ocupacional: el riesgo que no se ve |
| `E2-rosas-v2` + `-4x5-v2` | «Huele a rosas. / Pero se fumiga.» (sin acusar a la finca) | Agro: fumigar donde no parece peligroso |
| `L2-inserto-v2` + `-4x5-v2` | «¿Usa lentes? / Con inserto, sí sella.» | Operación: lentes con patillas rompen el sello |
| `C2-filtros-v2` | «Cada riesgo tiene su color. / Y su filtro.» | Compras: elegir el filtro por precio |

Cambios respecto de la ronda 1:
- **Producto:** se agregaron las fotos de los filtros ARMOR como referencia; los cartuchos llevan la banda amarilla.
- **Inserto óptico:** ahora aparece sin patillas.
- **Luz:** una sola gradación fría para toda la serie; el amarillo es el único acento.
- **Texto en la imagen:** sólo la línea superior, el titular y la oferta, con el logo pegado al bloque. El texto largo pasó al post.
- **Transparencia:** cada pieza lleva «Imagen ilustrativa generada con IA».
- **Formatos:** 1:1, 4:5 y 1,91:1.

Costo de la ronda 2: cuatro plates Sunburst `high` 2048² (≈ USD 0,21 c/u) y tres 4:5 de 1536×1920 (≈ USD 0,15 c/u), unos USD 1,30.

**Ampliación a 4:5 con Flux Fill: falló.** La cuenta de fal quedó sin saldo («User is locked. Exhausted balance»). Por eso los 4:5 se regeneraron con Sunburst, usando como referencia la escena aprobada.

**Sigue pendiente (punto 1):** el producto exacto. Hacen falta los modelos 3D o fotos en alta de la F680 y de los filtros, entregados por ARMOR.

## Textos orientados a cotización — 28/10/2026

Las piezas de Ecuador y Colombia piden la cotización. La visita técnica se ofrece como lo que se gana al pedirla.
- **Botón:** «Solicitar presupuesto» en las cuatro piezas.
- **Línea de respaldo:** «Asesor en planta · Respuesta en 24 h». **ARMOR confirmó el plazo de 24 h** (según informó Julio en el chat el 28/10/2026).
- **Texto del post:** abre con la pregunta y el pedido, porque son las primeras ~150 letras que se ven antes de «ver más».
- **Filtros:** el post usa el código de colores de la norma europea EN 14387 (café, amarillo, verde, gris y blanco).
- **Variante Perú (1:1 y 1,91:1):** busca visibilidad. La oferta es «Conozca la línea ARMOR y su distribuidor» y el botón, «Más información».
- **Detalle por pieza:** en `Textos-del-post-y-botones.png`.

## Campaña de lanzamiento en Perú — 28/10/2026

Encargo de Julio: armar en el canvas de la campaña de ejemplo la campaña de lanzamiento de Perú. Postura tomada
del caso de negocio y del borrador de propuesta: **visibilidad previa a la entrada con distribuidor**, sin formulario,
sin promesa de venta y sin nombrar revendedores.

| Plate (2048², Sunburst `high`) | Pieza | Fase |
| --- | --- | --- |
| `PE-L-llegada-v1` | «ARMOR llega / a la industria peruana.» | Días 1–30 · presentación |
| `PE-M-mina-v1` | «A 4.000 metros, / cada respiración cuenta.» | Días 31–60 · minería |
| `PE-A-agro-v1` | «Se cosecha para el mundo. / Se fumiga con filtro.» (Ica) | Días 31–90 · agroexportación |

- Formatos 1:1, 4:5 y 1,91:1 recortados del mismo plate; botón «Más información» hacia una landing sin formulario.
- Láminas en el canvas: `PE01-Estrategia` y `PE02-Textos` (página «Campaña de ejemplo», debajo de la ronda 2).
- **Antes de pautar:** ARMOR confirma la fecha de entrada (sin eso no salen «Nuevo en Perú» ni «llega»).
- La variante Perú de «No se ven» dejó de prometer distribuidor: ahora dice «Conozca la línea ARMOR para la industria».
- Costo: tres plates ≈ USD 0,21 c/u, unos USD 0,65. Un primer intento falló antes de gastar (rutas de referencia).

## Retoque lámina 08 — 28/10/2026

La foto de la lámina 08 traía el titular, la selección y el botón «ARMOR» incrustados. Se borraron con
inpainting (`retoques/s08-base.png` + `s08-mask.png` → `s08-limpia.png`, Sunburst `high`, 1920×1088). El modelo
regeneró la placa completa: quedó limpia, pero el rostro de la integrante (elenco ficticio) cambió levemente.
La lámina 05 reutiliza la foto aprobada ampliada 1,4× sin retoque.

## Logos e isotipos del deck — 28/10/2026

- AXIS (`@efeoncepro/axis-brand-assets/assets/platforms`): LinkedIn, Google Ads, Google Analytics y Google.
- Sets CC0 instalados en el repo (`@iconify-json/logos`, `simple-icons`): WhatsApp, Google Tag Manager, WordPress, Zapier y Make.
- Kommo, descargado con autorización de Julio (28/10): el logo que kommo.com declara en sus datos estructurados
  (`/static/images/pages/support/kommo-logo.png`, 1200×256) y su ícono de app (`pcfcdn.kommo.com/favicon.ico`, 96×96).
  Kommo no publica un kit de prensa con descargas. En el deck se usa el ícono recortado en círculo.
- Banderas: `circle-flags` 2.8.3 (MIT).
