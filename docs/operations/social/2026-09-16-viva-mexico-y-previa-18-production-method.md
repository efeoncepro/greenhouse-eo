# Viva México y previa 18 (2026): del concepto adversarial a Metricool

Fecha de registro: 2026-09-16. Owner: Social Media Studio / Efeonce.
Casos: carrusel **«Hay frases que no se tocan»** (Fiestas Patrias México, 16/09) y post **«Hay días que sí
rediseñaríamos»** (previa Fiestas Patrias Chile, 17/09). Bitácora técnica y creativa; las reglas transferibles viven en
las skills enlazadas por el [protocolo social](../SOCIAL_CREATIVE_AGENT_EXECUTION_V1.md). Artefactos, scripts, prompts y
QA en `ai-generations/2026-09-16_viva-mexico/` y `ai-generations/2026-09-17_previa-18/` (binarios fuera de git).

## 1. Estado

| Pieza | Red | Fecha/hora (America/Santiago) | ID | Estado verificado |
|---|---|---|---|---|
| Viva México, carrusel 7 láminas | Instagram `efeoncepro` | 2026-09-16 21:35 | 377234791 | `PUBLISHED` · `instagram.com/p/DdXlnyViI7n/` |
| Viva México, documento | LinkedIn organización | 2026-09-16 21:40 | 377235636 | `PUBLISHED` · `urn:li:ugcPost:7506150065338621952` |
| Previa 18, estática | LinkedIn organización | 2026-09-17 11:00 | 377254451 | `PENDING` (readback 2026-09-16 22:52) |
| Previa 18, estática | Instagram `efeoncepro` | 2026-09-17 12:00 | 377254381 | `PENDING` (readback 2026-09-16 22:52) |

Publicación y programación fueron autorizadas explícitamente por el operador. El consentimiento de las tres personas
del equipo que aparecen en el carrusel lo confirmó el operador antes de programar. No hay medición de audiencia.

## 2. Viva México: la conexión de marca se prueba, no se declara

La primera propuesta («La cuerda»: una cuerda de 11 años entre el Grito de 1810 y la consumación de 1821) fue
rechazada por el operador: «no logras conectar». Un subagente con mandato adversarial, obligado a leer
`09_marca-agencia.md`, el playbook, `SEASONAL_CONTENT.md` y los casos de revisión, confirmó el defecto:

- pasaba **al revés** la prueba de cambiar el logo (CEMEX, una Afore o un banco la firmaban igual);
- la conexión vivía en el caption y en la explicación del autor, no en la pieza;
- la moraleja de constancia era humo según la disciplina anti-humo de la marca;
- el caption reintroducía la ruta que el propio autor había descartado.

Los hallazgos del subagente se verificaron contra los documentos antes de usarlos: dos citas eran exactas, una
exageraba (la «doctrina de transcreación» sólo aplica al copy en inglés) y su ruta de datos reprobaba la misma
prueba del logo. La dirección elegida fue la que demuestra oficio de agencia: **editores que quieren mejorar
«¡Viva México!» y se contienen**. El chiste recae sobre los hábitos de la agencia, nunca sobre la frase.

### Límites legales y culturales verificados

- **Ley sobre el Escudo, la Bandera y el Himno Nacionales, art. 32 Bis** (México): personas e instituciones no pueden
  usar la Bandera para promover su imagen, bienes o servicios; también restringe el Escudo (reproducción y
  alteración) y prohíbe ejecutar el Himno con fines de lucro. Resultado: sin bandera, escudo, himno ni emoji 🇲🇽 en
  piezas de marca. Criterio orientador, no dictamen legal.
- Los colores de fuegos artificiales (verde, blanco, rojo) no son la bandera; se mezclaron por estallido y nunca como
  franjas. La lectura «verde a la izquierda, rojo a la derecha» quedó declarada como riesgo a validar localmente.
- Hechos citados: Grito en la madrugada del 16/09/1810; consumación el 27/09/1821; 2026 = 216 años del Grito.

### Recorrido del carrusel

1. «¡Viva México!» + comentario abierto de Daniela («¿Lo hacemos más memorable?») + logo.
2. Selección AXIS + cursor local; el comentario queda DESCARTADO.
3. Cursor de Melkin redimensiona; «¿Le sumamos un claim?» DESCARTADO.
4. Cursor local + Andrés; «¿Probamos una variante A/B?» DESCARTADO.
5. La selección se suelta; «Hilo resuelto · 3 sugerencias, 0 cambios» con las tres caras.
6. «Hay frases que no se tocan.»
7. «¡Viva México!» centrado y limpio en el final de fuegos + logo pequeño centrado abajo.

Decisiones que cambiaron el resultado:

| Observación del operador / QA | Corrección | Criterio transferible |
|---|---|---|
| «Equipo creativo» genérico | Caras reales del squad (`deck-axis/assets/squad/`), nombres en comentarios y cursores; María Fernanda retirada por el operador | Personas reales exigen consentimiento antes de publicar, no antes de producir |
| Avatares de 62 px ilegibles en móvil (≈22 px) | Tarjeta tipo chat con foto de 104 px a la izquierda (≈35 px a 390 px) | Validar caras y texto en el tamaño de consumo, no en el master |
| Fuegos dorado/rosa no evocaban México | Verde, blanco y rojo mezclados sobre cielo navy de la familia Efeonce | Color cultural sin reproducir el símbolo |
| Falta de impacto | Contrapicado desde la multitud, catedral, humo volumétrico; final con lluvia de chispas | «Impacto» se traduce a cámara, luz, escala y profundidad |
| Lámina 6 sin contraste tipográfico | Entrada Poppins 500 `softOnDark` → puente Bricolage 420 → remate «tocan.» Bricolage 800 | Una función por tramo; domina la palabra con el mecanismo |
| Cierre | La frase final queda idéntica en tipo, tamaño y posición a las láminas 1–5 | Si la pieza dice que algo no se toca, el remate visual tampoco lo toca |

Técnica de secuencia: **plate idéntico en las láminas 1–6** (al deslizar sólo cambian las ediciones) y un plate
distinto para el final, obtenido por edición del primero para conservar encuadre.

## 3. Previa 18: de plantilla plana a alto impacto

El concepto («17 → 18» como fecha que el equipo quiere rediseñar) cerró la serie «Hay…» entre México (16/09) y el Reel
chileno (18/09). Verificado: en 2026 el 18 cae viernes y el 19 sábado, el 17 es jueves hábil; existió un proyecto de
feriado para el 17 (tema político, deliberadamente no aludido).

| Versión | Qué era | Veredicto |
|---|---|---|
| v1 | Composición tipográfica plana: «17» gigante, «8» como contorno punteado, banderines vectoriales | Operador: «no se ve con ese impacto». Plano, contraste medio, acción implícita |
| v2 | Plate 3D (Sunburst) desde boceto con glifos reales: «18» brillante, cursor arrastra, «7» cae | Mejor, pero luz plana, cámara lejana, franja vacía, acción tímida |
| v3 | Escenario marino con foco cenital y humo, cámara baja, cursor con borde turquesa `#12afa2`, banderines en dos planos, piso reflectante | Alto impacto; el «7» se reconoce por contexto |
| v3b | Banderines del plano medio en rojo/blanco/marino (color de fonda chilena) | Aprobada y programada |

Una señal de fiesta (banderines de fonda) resolvió la relación con Fiestas Patrias para la audiencia global sin
bandera ni rojo en la acción. El rojo quedó en ≈4 % de la imagen, lejos del acento turquesa.

## 4. Procedimientos técnicos que funcionaron

- **Materialización 3D con forma de marca:** boceto SVG con glifos Bricolage reales en posición exacta → edición con
  `gpt-image-2.5-sunburst` (xhigh, 1600×2000) → composición determinística de copy y logo. Los números 3D no son
  vectores exactos de la fuente; declararlo.
- **Contraste sobre escenas brillantes:** scrim radial gradual centrado en la tinta del titular (fuegos) y degradado
  del piso reflectante («la luz decae con la distancia»). El contraste se mide sobre el plate YA oscurecido, percentil
  98 del fondo bajo la tinta, y el render falla bajo 4,5:1.
- **Guardias en el render:** fallar si el copy invade el aire de la firma, si un cursor/etiqueta AXIS sale del lienzo,
  si un comentario desborda su tarjeta o si quedan `<text>` sin convertir a trazados.
- **Recolor determinístico en vez de inpainting:** la edición con máscara de GPT Image 2.5 cambió la geometría de los
  banderines (menos, más grandes, borde desenfocado teñido) y se descartó. Se recoloreó sobre el plate original:
  detección de cada banderín por perfil de columnas (B−R 84–120 celestes, < 25 blancos), relleno por semilla,
  apertura morfológica para excluir el cordel, conservación de puntas bajo el cordel y luminosidad del píxel original.
- **AXIS collaboration selection:** los colaboradores sólo se anclan en esquinas; un cursor `moving` no puede tener
  `targetId`; las etiquetas de esquina necesitan aire (titular ≤ ~64 % del ancho en 1080) y el renderer emite
  `<text>` que debe convertirse a trazados con la fuente real.

## 5. Entrega y programación

- Viva México se programó con JPEG q95 derivados de PNG sin que nada lo exigiera. El operador lo corrigió y quedó la
  regla dura **social = PNG** (commit `69b0f61c7`). La previa 18 se programó en PNG.
- Instagram carrusel: `media` con las URLs en orden, `mediaAltText` por imagen persistido, `isAiGenerated:true`.
- LinkedIn documento desde imágenes: `publishImagesAsPDF:true` + `documentTitle`; Metricool arma el documento y
  devuelve `mediaAltText` nulo. El PDF local (`pdf-lib`, 7 páginas 1080×1350) quedó como respaldo.
- `updateScheduledPost` cambia el ID y conserva el UUID (377254397 → 377254451 al corregir «Hace un par de días» por
  «Ayer»). Registrar ambos.
- La subida al bucket falló por sesión gcloud vencida; se renovó con `pnpm gcloud:auth:playwright -- --force`.
- El carrusel figuró como no publicado para el operador a las 21:37; el readback ya mostraba `PUBLISHED` con URL
  pública. Distinguir demora del feed de fallo de publicación.
