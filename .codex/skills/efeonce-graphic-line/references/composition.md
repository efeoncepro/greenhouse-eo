# Cómo componer con la órbita

> Verificado contra: axis-design-system@a5c21ae — 2026-09-26 (íconos: AXIS `main@5b8ab20`, tag `v0.3.6`) ·
> greenhouse-eo@7cb24df17 — 2026-09-26 · decisiones del operador D1–D22 del 2026-09-26 registradas (ver
> [ledger.md](ledger.md)); lo que depende de las versiones en publicación (tokens/contratos 0.3.5, contrato de la
> órbita 0.3.1, paquete 0.3.2) va marcado así.
>
> Los resultados «esperados» de los ejemplos se obtuvieron ejecutando las funciones contra los `dist` de AXIS y el
> comando de Greenhouse ese día. El inventario completo (tokens, códigos, firmas) está en
> [package-and-tokens.md](package-and-tokens.md); la lista de verificación, en [qa-checklist.md](qa-checklist.md).
>
> **Íconos** (canónicos, D16–D22): dos voces —Trazo para lo que se mide, Plastilina para lo que se crea—, la esfera como
> estado (reposo o respuesta) y la órbita sesgada de Plastilina. No se componen con el contrato de la órbita sino con
> `@efeoncepro/axis-graphic-line/icons` (`resolveIcon`, `auditIconGroup`, `skewedOrbitHeroSvg`); la fuente de verdad es
> AXIS (`docs/agent-composition/iconography.md`). Criterio: [criteria.md](criteria.md) §3.14; detalle:
> [iconography.md](iconography.md).

## 0. El flujo, siempre el mismo

1. **Declara la intención** (qué hace la órbita en la pieza) con el contrato `efeonce.graphic-line-orbit`: línea de
   servicio, superficie, canal y elementos. Nunca un HEX, un px ni una coordenada decorativa.
2. **Valida y resuelve** (`resolveGraphicLineIntent`, `pnpm orbit:resolve` en AXIS o `pnpm creative:orbit:resolve` en
   Greenhouse). Un código de error detiene todo: corrige la intención, no el pintor.
3. **Pinta** con el paquete (`@efeoncepro/axis-graphic-line`: `composeGraphicLine`, una receta o `orbitSvg`) o, en
   Greenhouse, con el adapter (`pnpm creative:orbit:render`, `creative:layout` capa `graphic_line`).
4. **Liga lo que sólo tú sabes**: la geometría de cada `targetId`, la foto, tus cajas de texto, el sujeto y las reservas
   de la foto.
5. **Corre los `adapterChecks`** sobre lo pintado. Si uno falla, la pieza no sale.
6. Componer y pasar los chequeos **no aprueba ni publica**: la autorización es del operador.

**Alcance:** sólo marca propia de Efeonce y su familia (Growth, Brand, Engine, Voice, RevOps). **Nunca** trabajo de
clientes ni la interfaz de producto de Greenhouse (esa se rige por `DESIGN.md` y AXIS de producto).

---

## 1. Árbol de decisión: «qué quiero hacer → qué uso»

```text
¿La pieza necesita la órbita?
├─ No hace ninguno de sus trabajos (rodear, medir, navegar, enfocar) → NO la pongas. La foto conserva su composición.
└─ Sí:
   ├─ RODEAR algo (una palabra, un objeto, un grupo de texto)
   │    → orbit con targetId (+ targetKind) · un solo anillo, SIN innerOrbits · arco de acento con esfera
   │    → decorativa sin objeto: orbit con region (o orbitSvg); órbitas interiores sólo si está vacía
   ├─ MEDIR un dato real
   │    → ¿tienes el valor (0–1) Y su fuente? No → no hay arco. Sí → measure (o measureSvg)
   │      imprime trajectory.valueLabel («60 %») y la fuente junto al anillo
   ├─ NAVEGAR secciones (deck, informe por capítulos)
   │    → deck 1920×1080: deckSlideHtml('cover'|'section'|'content'|'close')
   │    → otro formato: progress { sections, current } (región, o targetId para el indicador de esquina)
   ├─ ENFOCAR una foto
   │    ├─ «lo que importa está aquí» (decisión, detalle) → LENTE: lensRecipe(formato) o lens
   │    └─ «te hacemos visible» (escenario, evento, cliente) → FOCO: spotlightRecipe(formato) o spotlight
   │         (siempre con su prueba: proof «Y lo medimos.» o el mecanismo)
   ├─ MOSTRAR la familia (portafolio) → family-map { center, satellites } (arco largo sin esfera, satélites)
   ├─ ESTADO libre/ocupado (salas, agenda, credenciales) → stateMarkerSvg / state con su etiqueta en texto
   │    └─ ¿está EN VIVO («en el aire», el eco del impacto en movimiento)? → orbit { sphereRing: true, live: true }
   │         (contrato 0.3.1; sin live, sphere-ring-only-live). Ocupado sin vivo = la esfera sola
   ├─ UNA PERSONA (firma de correo, tarjeta, perfil) → portraitOrbitSvg ; firma completa → efeonce.email-signature
   ├─ UN BUZÓN DE ÁREA → email-signature variant 'team' (área, sin foto)
   ├─ VOZ pregunta + respuesta → voice (texto tuyo) + answerHtml para la respuesta con su esfera
   ├─ LOGO dentro de una frase display → logo-inline (≥ 96 px, línea base y altura x)
   ├─ ÍCONOS (fila de servicios, lista, sticker, objeto del oficio) → NO es la órbita: @efeoncepro/axis-graphic-line/icons
   │    → voz por la línea de la PIEZA (iconVoiceForLine) · glifo de ICON_CATALOG (si no existe, alta en AXIS, nunca a mano)
   │    → resolveIcon en reposo; responde uno solo y sólo si la pieza no tiene otra esfera · auditIconGroup antes de entregar
   │    └─ objeto de Plastilina protagonista → skewedOrbitHeroSvg (objeto en reposo; la órbita sesgada pone la esfera y
   │         cuenta como la esfera de la pieza; nunca mide ni cruza el texto)
   ├─ CERRAR (última lámina, contratapa, final de video) → slogan { form, role: 'close' } de la línea
   │    └─ ¿el logo dentro de la órbita? SÓLO cierre del deck, cierre de video o muro de recepción, con su resguardo X;
   │         en cualquier otra pieza, el logo fuera de la órbita (D5)
   ├─ CIERRE DE VIDEO → brand-close (4,5 s) · órbita sola: pnpm orbit:video · logo: reveal/apertura/sting (Greenhouse)
   └─ FIRMAR la pieza
        ├─ ¿El logo de Efeonce YA aparece dentro de la imagen (mockup, objeto, merch)?
        │    ├─ No  → signature (logo centrado abajo)  ← el caso por defecto
        │    └─ Sí  → signature { brandInScene: true } (burbuja URL centrada, fusión de luminosidad)
        └─ Pie de deck/informe/papelería/stand (no es la firma de una pieza gráfica) → url-bubble { medium }
             (en canal social nunca: ahí firma signature)
```

### 1.1 Lente o foco

| | Lente (`lens`) | Foco (`spotlight`) |
|---|---|---|
| Qué dice | «aquí está la decisión» | «te hacemos visible» (+ prueba) |
| Fuera del círculo | foto en navy apagado: `grayscale 1`, `contrast 1.1`, `brightness 0.5`, multiplicar `#001a33` al 80 % | penumbra: `grayscale 0.85`, `brightness 0.32`, multiplicar `#021a33` al 60 % |
| Dentro | a color y ampliada ×1,25 | la misma foto más clara (`brightness 1.12`, `contrast 1.05`), borde suave desde el 78 % |
| La órbita | anillo con aire 0,12, arco corto de 50° y la esfera en la punta (arriba a la izquierda, lejos de la cara) | anillo **concéntrico** a 1,1 × la luz, al 22 %; la lámpara = arco de 50° desde 265° con la esfera |
| Obligatorio | `alt`; foto con un punto de interés claro | `alt` y, en la receta, `proof` |

### 1.2 Qué va en cada lugar de la voz

| Voz | Tipo | Marcador | Regla |
|---|---|---|---|
| Pregunta | Poppins 300 | anillo chico delante, en el acento | pregunta real del cliente, no retórica |
| Respuesta | Bricolage Grotesque 760, −0,035 em | la esfera como punto final (0,2 em, hueco óptico por letra) | 1 a 3 palabras; ≥ 3× el tamaño de la pregunta |
| Evidencia | Poppins, una palabra en negrita | — | dato, fuente o mecanismo; puede faltar |

La esfera **no** va en: la pregunta, el eyebrow, etiquetas, cuerpo de texto ni el eslogan.

### 1.3 Línea de servicio → acento y palabra del eslogan

| Qué vende la pieza | `line` | Palabra | Producto (sólo contexto) | Acento oscuro / claro |
|---|---|---|---|---|
| Efeonce, estrategia y medición | `growth` | Growth | Greenhouse | `#36c8bf` / `#0e8c82` |
| Servicios creativos | `brand` | Brand | Globe | `#ff6500` / `#bb1954` |
| Web, infraestructura, SEO y medición | `engine` | Engine | Wave | `#0375db` / `#0375db` |
| Medios y distribución | `voice` | Voice | Reach | `#f83902` / `#f83902` |
| RevOps y CRM en HubSpot | `revenue-hubspot` | Revenue | — (plataforma HubSpot) | `#e86bd0` / `#8e1b82` |
| RevOps y CRM en Salesforce | `revenue-salesforce` | Revenue | — (plataforma Salesforce) | `#2fb8ff` / `#00739e` |

Toda pieza, de cualquier línea, **firma Efeonce** (el `assetId` de la firma es siempre `efeonce-logo-*`). El producto
aparece como nombre, interfaz en un mockup o isotipo chico dentro de su propia superficie; el lockup «Producto by
efeonce» sólo en la superficie del producto. Un acento por pieza; el teal es sólo de Efeonce (Growth).

**Cómo se usa el acento** (D1, 2026-09-26; token `accentContrast`): en gráfico (arco, esfera, halo) y en texto de 24 px o
más, siempre ≥ 3:1 contra su fondo (todos los acentos de la tabla lo pasan). **Nunca en texto de menos de 24 px**: ahí
el texto va en navy `#023c70` sobre claro o blanco sobre oscuro. El HubSpot magenta queda tal cual (D2).

---

## 2. Reglas duras (qué hace fallar una pieza)

| # | Regla | Quién la hace cumplir |
|---|---|---|
| 1 | **Ningún texto cruza el anillo**: cada caja de texto queda entera adentro o entera afuera | `textCrossesRing`, las recetas lanzan error, `runAdapterChecks` |
| 2 | **Un anillo por pieza** (una órbita, una lente, un foco, un progreso, una medida, un mapa o un cierre); nunca un patrón. Una lente u órbita por muro o vidrio | `single-ring-per-piece` |
| 3 | **El arco de avance sólo con un dato real y su fuente**; sin fuente no hay arco | `measure-source-required`, `measure-value-out-of-range` |
| 4 | **Norma de trayectoria**: el dato es la posición de la esfera. Parte a las 12 (marca de partida en el anillo), recorre en sentido horario valor × 360° (60 % = 216°) con la estela corta (50°) detrás, nunca antes de la partida; 0 % = esfera en la partida; 100 % = la esfera vuelve a las 12 y **no desaparece**. Nunca un loader que se llena. Dos datos en una pieza: mismo radio y misma partida | `measure-origin-is-top`, manifest `arc` = estela, `originMark` |
| 5 | **El arco de acento es movimiento, no un dato**: nunca junto a un número | check `accent-arc-never-reads-as-data` (revisión) |
| 6 | **Un solo anillo alrededor del contenido**: con `targetId` no hay órbitas interiores; sólo una órbita vacía (anatomía, mapa de portafolio) las lleva | `inner-orbits-never-around-content` |
| 7 | **La esfera final es parte del texto**: guías, marcas de corte, selección y cursores miden palabras + esfera | `answerGroupBox`, `toolContainsAnswer`, `answer-period-part-of-text`, `target.bounds` de la selección |
| 8 | **La lente lleva la anatomía de la órbita** (anillo, arco, esfera en la punta), nunca un disco suelto | contrato (`lens.anatomy`); `accentSphereDiameterRatio` deprecado |
| 9 | **El foco siempre con su anillo concéntrico** y la lámpara; en movimiento la luz y su órbita viajan juntas | receta + CSS `spotlight-light`/`spotlight-orbit` |
| 10 | **Arco genérico centrado en su posición**: `upper-start` → 200° a 250°, la esfera en la punta; 40–60° (resuelve 50°) | contrato |
| 11 | **Formatos fijos reproducen su pieza medida** (`pieces`, `portrait`): no se derivan de una escala | recetas (`applyPiece`) |
| 12 | **La línea de servicio decide acento y palabra**; Efeonce firma siempre | contrato (`lines`, `assetId`) |
| 13 | **Firma = logo de Efeonce centrado abajo** (20 % del lado corto, 25 % en 16:9, margen 9 %); la burbuja URL la **reemplaza** sólo si el logo ya está en la imagen, centrada y fusionada; nunca a un costado ni junto al logo; nunca firma y burbuja a la vez | `signature`, `single-signature-per-piece`, `signature-already-decides-url-bubble`, `social-signs-with-signature-not-url-bubble`, checks `signature-centered` y `signature-min-contrast` (≥ 4,5:1; la burbuja con su token `urlBubble.minContrast`, D4) |
| 14 | **La URL nunca como texto**: donde aparezca `efeoncepro.com`, su burbuja oficial | `urlAsTextForbidden`, check `url-as-bubble-never-text` |
| 15 | **La órbita no sustituye la composición fotográfica**: se declara a propósito y nunca cruza el sujeto, las reservas de texto, el lecho ni la firma | `orbit-never-over-subject-or-reserves` (`ringCrossesBox` / `protect`) |
| 16 | **Respuesta de 1 a 3 palabras**; un par de voz por pieza | `voice-answer-too-long`, `single-voice-pair-per-piece` |
| 17 | **El eslogan sólo cierra**, desde el archivo oficial, sin esfera, sin mayúsculas, sin traducir ni cambiar pesos | `slogan-closes-only`, `uppercaseAllowed/sphereAllowed false` |
| 18 | **Estado = forma, no color**: anillo libre, esfera ocupado, con la etiqueta en texto; nunca semáforo | `state-label-required`, `trafficLightColorsAllowed false` |
| 19 | **El cierre de marca no va en impresos** | `brand-close-needs-motion-channel` |
| 20 | **El logo** se usa desde el archivo oficial: sin estirar, rotar, recolorear, efectos, sombras, esfera pegada, tipearlo, logo + isotipo juntos; mínimo 96 px / 25 mm (isotipo 24 px / 8 mm); resguardo X = alto de la nave | manual §8; los archivos de `axis-brand-assets` |
| 21 | **Nada de motion generado por un modelo de video** para el logo o la órbita | norma de movimiento |
| 22 | **El acento ≥ 3:1 contra su fondo** en gráfico y texto ≥ 24 px; **nunca en texto de menos de 24 px** (navy o blanco) | token `accentContrast`; check `accent-text-min-size` (contrato 0.3.1) |
| 23 | **El logo dentro de la órbita sólo en cierres de marca**: cierre del deck, cierre de video y muro de recepción, con el resguardo X fuera del anillo. Nunca en el banner de LinkedIn ni en el reverso de la tarjeta; en objetos, el logo solo en el dorso | decisión del operador D5; revisión |
| 24 | **El anillo propio de la esfera sólo «en vivo»**: `sphereRing: true` exige `live: true` (eco del impacto, estado «en el aire») | `sphere-ring-only-live` (contrato 0.3.1) |
| 25 | **Halo sobre papel a media intensidad** | token `orbit.haloOnLightScale 0.5`, aplicado por el resolver 0.3.1 (con 0.3.0, a mano) |

> **Logo dentro de la órbita — decidido (operador, 2026-09-26, D5):** sólo en los cierres de marca (cierre del deck con
> `deckSlideHtml('close')`, cierre de video, muro de recepción), con el resguardo X respetado. Nunca en el banner de
> LinkedIn ni en el reverso de la tarjeta. En todo lo demás rige el manual §8.3 n.º 8. El contrato sigue aceptando
> `targetKind: 'logo'` (no distingue la pieza): usarlo sólo en esos tres cierres es responsabilidad de quien compone.

---

## 3. Recetas por superficie

| Superficie | Qué usar (exacto) | Notas |
|---|---|---|
| **Post 1080×1350** | `lensRecipe('post', input)` + `recipeHtml` (o `lensRecipe('campaign-post')` para la lente de campaña, más grande y alta) | lente arriba, pregunta y respuesta debajo, firma de Efeonce automática. Sin lente: `composeGraphicLine` con `orbit` + `voice` + `signature`, `channel: 'social'` |
| **Story 1080×1920** | `lensRecipe('story', input)` | en 9:16 de pauta la firma al pie puede caer bajo la interfaz de la red: revisa la zona segura |
| **LinkedIn 1200×627** | `lensRecipe('linkedin', input)` (pregunta, respuesta y `proof` como línea de apoyo) | sin firma en la receta |
| **Deck 1920×1080** | `deckSlideHtml('cover'|'section'|'content'|'close', { sections, current, question, answer, eyebrow?, stats?, note? })`; portada con foto: `lensRecipe('deck-cover')` | la órbita es la navegación; en contenido, `stats` reales o `note: 'Datos de muestra'`; en el cierre, el logo dentro de la órbita (cierre de marca, D5) y la palabra del eslogan en el acento (D3; axis-graphic-line 0.3.2) |
| **Muro de recepción** | `lensRecipe('wall', { answer })` (sin pregunta) o `spotlightRecipe('event', …)` | una lente u órbita por muro |
| **Foto con luz de escenario** | `spotlightRecipe('photo', { …, proof })` | nunca nombres reales de competidores en la penumbra; revisión legal del claim antes de pauta |
| **Oficina** (salas, directorio, vidrios) | `stateMarkerSvg({ value, line, surface, sizePx })` junto a la etiqueta; órbita por pieza con `orbitSvg` | anillo = libre, esfera = ocupado; el arco del estado de sala mide tiempo real; la señalética de servicio en Poppins sin esfera ni órbita |
| **Merch y objetos** | archivos estáticos `axis-brand-assets/assets/orbit/orbit-<línea>-<superficie>-print.{svg,png}` (o `orbitSvg`) + la palabra con su esfera | frente: la palabra en Bricolage con su punto (la órbita opcional, alrededor de la palabra); dorso: el logo solo. Cerámica sin halo: anillo 0,5 mm, arco 1,2 mm, esfera Ø 4,4 mm, órbita Ø 74 mm. Prueba física antes de producir |
| **Papelería** | hoja A4: órbita recortada en la esquina superior derecha al 18 % en navy; pie cuya línea termina en la esfera (`sphereDividerSvg`); URL como `url-bubble` horneada | nunca la órbita detrás del texto; la continuación no lleva órbita |
| **Firma de correo** | contrato `efeonce.email-signature` + `portraitOrbitSvg` (PNG 2×) + `sphereDividerSvg` (pasa `spherePx: 9`) | HTML con tablas y estilos en línea; imágenes en PNG servidas desde URL pública; sin frase de cierre; respuesta = una línea de texto vivo |
| **Informe / Insights (A4 794×1123)** | `measure` (o `measureSvg`) con `source`, `channel: 'print'`; pie con `url-bubble { medium: 'pdf' }`; progreso por capítulos con `progress` | origen verificado en producción: `src/lib/artifact-composer/catalogs/insights-report/report-cover*.html` y `report-back-cover.html` (Greenhouse) |
| **Video: órbita sola** | web: `ORBIT_MOTION_CSS` + clase `axis-orbit-animate` (o `<AxisOrbit animate>` / `<axis-orbit animate>`); archivo: `pnpm orbit:video -- --format … --surface …` en AXIS | 2,0 s + 0,5 s de reposo; reducido = cuadro final |
| **Video: cierre de marca 4,5 s** | elemento `brand-close { format }` (valores) + tu render con los archivos oficiales | anillo, arco, la esfera asienta, halo, logo, eslogan |
| **Video: logo** | reveal 3,6 s · apertura 2,4 s · sting 1,6 s, producidos en Greenhouse con `scripts/creative/brand-motion/` | valores en `efeonceGraphicLine.motion`; masters en `gs://efeonce-group-axis-public-media/motion/logo/v1.1/`; nunca para clientes ni UI de Greenhouse |
| **Pieza de campaña en Greenhouse** | `pnpm creative:layout` con `formats[].graphic_line: { intent, protect[] }` y `brand.signature: { brand_in_scene }` | la capa `graphic_line` acepta sólo `orbit`, `measure`, `progress`, `lens`, `spotlight`, `family-map` (copy y firma son del compilador); el intent debe tener el mismo lienzo que el formato. **Ojo:** el adapter de Greenhouse no pinta `spotlight` ni `family-map` aunque la capa los acepte |
| **Pieza con CTA en Greenhouse** | `pnpm foto:componer:cta <plan>` + `pnpm foto:cta:gate <plan>` | con el logo ya en la imagen: `url` + `marcaEnEscena: true` y **sin** `logo` |

### 3.1 La órbita sobre una foto del lenguaje fotográfico

La foto conserva su composición. Declara lo que la foto protege y deja que el chequeo decida:

- Paquete: `runAdapterChecks({ svg, circles, texts, protectedBoxes })` — cada caja en `protectedBoxes` (sujeto, reserva
  de texto, lecho, firma) no puede quedar bajo el trazo del anillo.
- Greenhouse: `bindings.protect: [{ id, kind: 'subject' | 'reserve' | 'bed', x, y, w, h }]`. La órbita no puede cruzar
  `subject` ni `reserve`; la firma no puede caer sobre `subject` ni `reserve` (sí sobre el `bed`, el lecho calmo).
  `creative:layout` agrega el campo de copy como `reserve` automáticamente.
- La foto de una lente se produce con el pipeline fotográfico (`pnpm foto:prompt`, `pnpm foto:generar <ficha>`,
  `pnpm foto:validar`): el sujeto cabe en el círculo que la lente muestra en ese formato (el 55 % se mide sobre el
  círculo visible, D10 P-3), palanca que concentre y nunca una que llene el cuadro (P-9), sin emblema legible, registro
  documental, sin velo navy encima, y sin otro anillo dentro de la escena (P-4: cuenta como órbita; se pide otro plate).
- En la lente, el oscurecimiento de afuera **es** la reserva del texto (D10 P-1): la pregunta y la respuesta van sobre
  esa zona apagada. En una pieza sin lente sigue el «nunca scrim» del lenguaje fotográfico.

### 3.2 Ids del SVG

Máscaras, recortes y degradados se referencian con `url(#id)` y el navegador toma el **primero** del documento.

- Por defecto el prefijo es un hash de lo pintado (`uniqueSvgPrefix`): dos piezas **distintas** en una página nunca
  chocan y el servidor y el cliente producen los mismos bytes.
- Dos piezas **idénticas** en una página (cuadros de un storyboard, la misma órbita repetida) necesitan cada una su
  `idPrefix` (en `bindings`, en `OrbitOptions`, en `RecipeInput` o en `DeckInput`).
- `<AxisOrbit>` lo resuelve solo con `useId`; `<axis-orbit>` vive en su shadow DOM (ids aislados).
- El adapter de Greenhouse usa un contador propio (`gh-halo-N`, `gh-lens-N`) por proceso.

---

## 4. Ejemplos trabajados (reales)

### E1 · Una órbita decorativa en un post

```ts
import { orbitSvg } from '@efeoncepro/axis-graphic-line'
const { svg, circles, manifest } = orbitSvg({ width: 1080, height: 1350, channel: 'social' })
```

Resultado: `circles.orbit = { cx: 540, cy: 675, r: 324 }` (radio = 30 % del ancho, vertical);
`manifest.canvas.scale = 2.3804`, `socialMultiplierApplied: true`; anillo `#72ded8`, trazo 2,38, opacidad 0,16;
arco `startDeg −160`, `sweepDeg 50` (200°→250°), trazo 3,81, `#36c8bf`; esfera r 8,33 en la punta; halo 1,86 × radio;
`trajectory.meaning = 'accent'`, `pairsWithNumber: false`. El texto de la pieza va afuera del círculo.

Variante: `orbitSvg({ width: 1920, height: 1080, line: 'brand', surface: 'light', channel: 'screen', region:
'center-end' })` → círculo `{ cx: 1344, cy: 540, r: 432 }` (40 % del alto), anillo navy `#023c70` 2,42 al 16 %, arco y
esfera `#bb1954` (3,87 y 8,46). *(Medido con el contrato 0.3.0; con el 0.3.1 el halo de esta variante clara sale a la
mitad: paradas 0,065 → 0,015 → 0, por `haloOnLightScale`.)*

### E2 · Un dato: 60 % con su fuente

```ts
import { measureSvg } from '@efeoncepro/axis-graphic-line'
const m = measureSvg({ width: 400, height: 400, value: 0.6, source: 'GA4, sep 2026', circle: { cx: 200, cy: 200, r: 100 } })
```

Resultado: `m.trajectory = { meaning: 'measure', origin: 'top', direction: 'clockwise', sweepDeg: 216, value: 0.6,
valueLabel: '60 %', pairsWithNumber: true }`, `m.source = 'GA4, sep 2026'`, anillo en `r 100`, esfera en
`(141.22, 280.9)`, estela de 50° detrás y marca de partida a las 12. Con `value: 0` la esfera queda en `(200, 100)` sin
estela; con `value: 1`, `sweepDeg 360` y la esfera de vuelta en `(200, 100)` con su estela. Imprime «60 %» y
«GA4, sep 2026» como texto, fuera del anillo. `source: ' '` lanza `measure-source-required`.

### E3 · Post con lente, voz y firma (intent completo)

```json
{
  "canvas": { "width": 1080, "height": 1350, "line": "growth", "surface": "dark", "channel": "social" },
  "elements": [
    { "kind": "lens", "id": "lens", "photoId": "L3", "alt": "La sombra de una mano pone un imán sobre la órbita", "region": "upper-center", "subjectRegion": "upper-center" },
    { "kind": "voice", "id": "voice", "questionId": "question", "answerId": "answer", "answerText": "Hacer" },
    { "kind": "signature", "id": "firma" }
  ]
}
```

```ts
const { svg, circles, manifest } = composeGraphicLine(intent, { photos: { L3: '/media/L3.webp' }, assetBase: '/branding/' })
```

Resultado: `circles.lens = { cx: 540, cy: 486, r: 324 }` (la foto; la órbita va a r × 1,12); lente con anillo 1,9 al
28 %, arco 50° desde −160 con trazo 3,81 y esfera 7,62; firma `mode 'logo'`, `assetId 'efeonce-logo-negative'`,
pintada como `<image … href="/branding/efeonce-logo-negative.svg" x="432" y="1202.04" width="216" height="50.76"/>`.
La pregunta y la respuesta **no** están en el SVG: las escribes tú fuera del anillo, la respuesta con
`answerHtml('Hacer', manifest.palette.accent)` (esfera 0,2 em con hueco −0,02 em por terminar en «r»).

### E4 · La receta del post (línea Brand)

```ts
const r = lensRecipe('post', { photoId: 'p', photoSrc: '/p.webp', alt: 'Variantes de una etiqueta', question: '¿Cuál sale al aire?', answer: 'Esta', line: 'brand' })
const html = recipeHtml(r)
```

Resultado: `r.circle = { cx: 548, cy: 600, r: 263.2 }` (la pieza medida `pieces.lens.post`), `r.accent = '#ff6500'`;
`r.texts`: pregunta 38 px en `{ x: 97.2, y: 943.38, w: 885.6, h: 51.3 }` y respuesta 140 px en
`{ x: 97.2, y: 994.68, w: 885.6, h: 142.8 }`; firma de Efeonce centrada abajo. Con `answer: 'una respuesta demasiado
larga'` lanza «more than 3 words».

### E5 · El foco (línea Engine)

```ts
const s = spotlightRecipe('photo', { photoId: 'l7', photoSrc: '/l7.webp', alt: 'Una pieza proyectada', answer: 'Te hacemos visible', proof: 'Y lo medimos.', line: 'engine', subjectRegion: 'center-end' })
```

Resultado: `s.circle = { cx: 1150, cy: 420, r: 396 }` (el anillo, 1,1 × la luz de r 360), acento `#0375db`; la respuesta
se ajusta a **53 px** (objetivo 88) para caber a la izquierda del anillo, en `{ x: 97.2, y: 491.37, w: 560.68 }`; la
prueba a 32 px debajo. Sin `proof` lanza ««visible» always goes with its proof».

### E6 · Deck: la órbita navega

```ts
const html = deckSlideHtml('section', { sections: 5, current: 2, question: '¿Qué probamos?', answer: 'Lo que probamos' })
```

Resultado: lámina en papel con `data-axis-sweep="144"` y `data-axis-value="0.4"` (2 de 5 = 144° desde las 12), anillo
en `(1420, 540, r 300)` de trazo 2,2 al 14 %, esfera r 7,7, el número «02» dentro del anillo y «Sección 2 de 5».

Mismo principio con el contrato puro (otro formato): `progress { sections: 4, current }` → `current 0`: arco de 50°
desde −90 (portada) · `current 2`: 180° · `current 4`: 360°, `closed: true`, la esfera sigue arriba.

### E7 · Mapa de la familia

```ts
composeGraphicLine({ canvas: { width: 1100, height: 520, line: 'growth' },
  elements: [{ kind: 'family-map', id: 'mapa', center: 'efeonce', satellites: ['globe', 'wave', 'reach', 'greenhouse'] }] },
  { icons: { greenhouse: '/branding/greenhouse-mark.svg' } })
```

Resultado: círculo `{ cx: 550, cy: 260, r: 208 }`, anillo al 22 % con dos órbitas interiores, arco de 140° desde 180°
en degradé y **sin esfera**, cuatro satélites (discos blancos de 41,56 px) repartidos sobre el arco con su isotipo
positivo (`globe-isotype-positive`, …); Greenhouse usa el ícono que pasaste en `icons` (no está en el paquete).

### E8 · Firma cuando el logo ya está en la imagen

```ts
resolveGraphicLineIntent({ canvas: { width: 1920, height: 1080, channel: 'screen' }, elements: [{ kind: 'signature', id: 'firma', brandInScene: true }] })
```

Resultado: `mode 'url-bubble'`, `reason 'brand-in-scene'`, `assetId 'url-bubble-source'`,
`blend { mode: 'luminosity', source: '#848484' }`, `widthOfShortSide 0.25` (16:9), `alt 'efeoncepro.com'`. Con
`medium: 'pdf'` en 1080×1350 oscuro: `assetId 'url-bubble-baked-dark'`, `blend null`. La fusión sólo llega a 4,5:1
sobre lechos muy oscuros: el adapter mide y falla si no (en Greenhouse, `renderGraphicLine` → `signature.contrast`).

### E9 · Cierre de una pieza de RevOps en HubSpot

```ts
resolveGraphicLineIntent({ canvas: { width: 1920, height: 1080, line: 'revenue-hubspot', surface: 'dark', channel: 'screen' },
  elements: [{ kind: 'slogan', id: 's', form: 'lockup', role: 'close' }, { kind: 'state', id: 'st', value: 'busy', labelId: 'lbl' },
             { kind: 'brand-close', id: 'bc', format: '16x9' }, { kind: 'logo-inline', id: 'li', phraseId: 'ph' }] })
```

Resultado: `canvas.product null`, `canvas.platform 'hubspot'`, `palette.accent '#e86bd0'`, fondo `#091951`;
eslogan `text 'Empower your Revenue'` con la palabra en `#e86bd0`; estado `marker 'sphere'`; cierre `totalMs 4500`,
`logoAssetId 'efeonce-logo-negative'` (Efeonce firma), `reducedMotion 'final-frame'`; logo en frase `minLogoPx 96`.
(El cierre cuenta como anillo: no agregues otro `orbit` en la misma pieza.)

### E10 · Greenhouse: medir en un informe A4 y certificar

`intent.json`:

```json
{ "canvas": { "width": 794, "height": 1123, "line": "growth", "surface": "light", "channel": "print" },
  "elements": [{ "kind": "measure", "id": "otd", "targetId": "kpi-otd", "value": 0.92, "source": "ICO · OTD, septiembre 2026 (dato de muestra)", "label": "92 % a tiempo" }] }
```

`bindings.json`:

```json
{ "targets": { "kpi-otd": { "cx": 397, "cy": 440, "r": 150 } },
  "texts": [{ "id": "valor", "x": 317, "y": 400, "w": 160, "h": 80, "content": "92 %" },
            { "id": "fuente", "x": 96, "y": 700, "w": 600, "h": 30, "content": "ICO · OTD, septiembre 2026 (dato de muestra)" }] }
```

```bash
pnpm creative:orbit:render -- --intent intent.json --bindings bindings.json --out-dir out/
```

Resultado: `{"status":"pass"}`, exit 0. `qa.json`: anillo en `(397, 440, r 168)` (150 × 1,12), estela
`startDeg 191.2`, `sweepDeg 50`, trazo 1,6 `#0e8c82`, anillo navy 1 px al 16 %, esfera r 3,5; `trajectory.sweepDeg
331.2`, `valueLabel '92 %'`. Chequeos `pass` salvo `lens-subject-inside-circle`, `accent-arc-never-reads-as-data`,
`answer-period-part-of-text` y `measure-shows-value-and-source`, que el adapter deja en `manual` (revisión visual). El
adapter de Greenhouse no pinta la marca de partida a las 12: agrégala o revisa que el valor y la fuente se lean.

### E11 · Intenciones que el contrato rechaza

| Intent (resumen) | Códigos |
|---|---|
| social 1080×1350 con `orbit { targetId: 'logo', innerOrbits: true }` + `lens { alt: '' }` + `url-bubble` | `inner-orbits-never-around-content(a)`, `photo-alt-required(b)`, `social-signs-with-signature-not-url-bubble(u)`, `single-ring-per-piece` |
| `measure { start: 'end' }` + `voice { answerText: 'Lo que medimos cada mes' }` | `measure-origin-is-top(m)`, `voice-answer-too-long(v)` |
| print 794×1123 con `brand-close` + `signature` + `url-bubble` | `brand-close-needs-motion-channel(c)`, `signature-already-decides-url-bubble` |

### E12 · Firma de correo completa (tarjeta navy)

```ts
resolveEmailSignatureIntent({ variant: 'full', surface: 'dark',
  zones: ['portrait', 'identity', 'contact', 'links', 'sphere-divider', 'brand-close', 'section-rule', 'endorsement'],
  partners: [/* hubspot, salesforce, adobe, microsoft, aws, googlecloud, claude, openai, byteplus */].map(p => ({ ...p, claimStatus: 'declared' })) })
```

Resultado: `sloganWord 'Growth'`, 460 px, padding `[22, 24]`, aire antes de cada zona `[0, 0, 0, 0, 18, 14, 20, 16]`,
paleta `bg #001a33 · name #ffffff · sub #9fb3c8 · text #e6edf3 · line #1d3a57 · accent #36c8bf`, `sphereDivider`
una vez (esfera 9 px en el acento), `sectionRule.sphere false`, partners en filas `5 + 4` en `#7c92aa`, `alt` «Partner
oficial de HubSpot, Salesforce, Adobe, Microsoft, AWS, Google Cloud, Claude, OpenAI y BytePlus». Respuesta:
`{ variant: 'reply', surface: 'light', zones: ['identity', 'contact'] }` → `form 'single-line'`, `images false`.
Equipo (contratos ≥ 0.3.4): `{ variant: 'team', area: 'talent', zones: ['area-mark', 'identity', 'contact', …] }`.

### E13 · Selección colaborativa sobre una respuesta

```ts
resolveCollaborationSelectionIntent({ targetId: 'answer', variant: 'four-corners', cursors: [
  { id: 'local', kind: 'local', targetId: 'answer', anchor: 'bottom-end', action: 'select' },
  { id: 'ana', kind: 'collaborator', targetId: 'answer', anchor: 'top-end', action: 'resize', label: 'Dirección de arte', participantKind: 'role' } ] })
```

Resultado: `target.bounds 'rendered-group-including-terminal-sphere'`, padding `standard` (0,012 / 0,01 del ancho),
overlay `subtle` (0,1, luminosidad), cursor local `north-west` (screen-fixed), colaborador `south-west` con
`attachment 'south-west'`. Mide la caja con `answerGroupBox(cajaDeLasPalabras, fontPx, 'Idea')`: la selección que deja
la esfera afuera falla `answer-period-part-of-text`.
