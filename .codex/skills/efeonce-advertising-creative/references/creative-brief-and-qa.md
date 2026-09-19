# Brief y gate de calidad para una pieza publicitaria

Usa este registro cuando el encargo produce o corrige un archivo. Completa sólo lo aplicable; conserva la
evidencia junto a la versión revisada.

## Brief mínimo

| Campo | Decisión |
|---|---|
| Marca / cliente | Identidad exacta y brand pack autorizado |
| Objetivo | Una acción o lectura principal |
| Canal / soporte | Social orgánico, paid, cover, brochure, OOH, presentación o video |
| Formato | Dimensiones, ratio, duración y tamaño de revisión |
| Audiencia / contexto | Quién lo verá, dónde y a qué distancia/velocidad |
| Copy | Texto literal, jerarquía semántica, CTA y legales |
| Activos | Imagen/video, logo, fonts y provenance/licencia |
| Selección colaborativa | Target real, variante, aire, overlay, cursores local/acting/moving, labels y adapter |
| Estado esperado | Explorar, producir, corregir, aprobar, programar o publicar |

## Ficha tipográfica

Registra el identificador/versión del contrato AXIS leído y, por cada tramo, `rol → familia → archivo →
receta/peso/ejes → tamaño → leading → tracking → ancho máximo → líneas máximas → color/fondo`. No uses “bold”
o “cursiva” como especificación si el archivo/instancia exactos no están disponibles.

Antes de componer, decide qué capa debe dominar y cuál se puede retirar sin perder sentido. Si las tres familias
necesitan gritar a la vez, el problema es de jerarquía, no de tamaño.

## Pruebas obligatorias

1. **Peso:** compara al menos una receta menos pesada que la primera elección. Evalúa caja de tinta, contraformas,
   ancho y distancia; no el número aislado.
2. **Ritmo:** prueba leading y tracking en la palabra/frase real. Las líneas deben leerse como una unidad sin
   tocarse ni fragmentarse.
3. **Cortes:** evita huérfanas, palabras mutiladas y líneas con funciones semánticas mezcladas. El salto refuerza
   el sentido.
4. **Contraste:** mide texto y logo sobre el fondo local real, incluidos frames críticos de video. Documenta el
   peor caso, no el promedio.
5. **Escala:** revisa al 100 % y en miniatura/tamaño de feed. La lectura principal debe sobrevivir primero.
6. **Movimiento:** una función por momento; no animes las tres voces simultáneamente. Subtítulos y copy crítico
   permanecen legibles sin depender del audio.
7. **Selección colaborativa:** conserva el intent y manifest AXIS. Verifica target real, aire óptico consistente,
   overlay bajo el contenido, hotspot local sobre el anclaje, multiplayer `acting` fuera con la punta en la
   esquina, `moving` sin contacto y placa siempre próxima al puntero. Repite en el formato más estrecho y ancho.
8. **Contraste por nivel (carrusel/pieza con varias voces).** Mide cada voz por separado —etiqueta, entrada,
   dominante, cierre, tarjeta, pie, logo— sobre el fondo real bajo su caja de tinta, **y cada acento `[[…]]` aparte**
   (sus `accentBoxes`, con la luminancia de su tinta, p. ej. `#ff6500`). La métrica de referencia es la p98 de
   luminancia del fondo bajo la tinta (conservadora: pesca luces puntuales). Si un nivel queda bajo el umbral y aun
   así lo apruebas porque se lee, registra la **revisión visual a 390 px** junto al número; sin esa nota es REWORK.
   Guarda el resultado por lámina (p. ej. `out-v2/qa.json` en «Nivel de búsqueda», 2026-09-19).
9. **Tarjetas de notificación / paneles UI.** 🔴 **En fotografía de marca propia Efeonce NO se usan** (decisión del
   operador 2026-09-19: la tarjeta con línea naranja fue puntual del post de GTA VI). El dato va como texto limpio
   (Poppins) sobre una zona clara de la propia foto. En ilustración/HUD de género, si la pieza usa una tarjeta tipo
   HUD, debe ser vidrio esmerilado **real**: región del propio plate desenfocada (en el caso, `blur 22` + máscara redondeada), borde sutil y tinta
   oscura translúcida encima. Es un elemento de UI del género que la escena justifica, no un rectángulo decorativo
   detrás de palabras; si no cumple una función narrativa, se retira.
10. **Oscurecimientos graduales declarados.** 🔴 **En fotografía de marca propia Efeonce: NUNCA.** Decisión del
    operador 2026-09-19: «es muy 2010, le resta limpieza». El contraste se planifica en la toma pidiendo la zona con
    su tono (sombra profunda y pareja, o muro claro y parejo); si no pasa 4,5:1 se regenera el plate o se mueve el
    texto. En ilustración, un scrim es la última opción, tras intentar encuadre, posición y plate.
    Si queda, se declara **por lámina** (`scrimTop { to, opacity }`, `scrimBottom { from, opacity }`) como degradado
    que se funde con la escena; nunca un velo rectangular ni un valor global oculto en el compositor.
11. **Hoja de revisión.** Arma una hoja con todas las piezas en el orden de publicación. Si se genera ordenando
    nombres de archivo, una pieza suelta fuera de la secuencia se intercala mal (el operador creyó que la
    contraportada estaba penúltima): nómbrala fuera de la serie o preséntala aparte.

## Gate DO / DON’T

| Revisión | DO | DON’T |
|---|---|---|
| Jerarquía | Una tesis dominante y apoyo claramente secundario | Tres titulares del mismo peso o tamaño |
| Bricolage | Peso/ejes ajustados a longitud y soporte | ExtraBold como default para toda frase |
| Poppins | Contexto, continuidad y énfasis breve | Cursiva larga o varios párrafos en cursiva |
| Guttery | Un gesto corto, real y opcional | Sustitución, imitación o frase larga decorativa |
| Espaciado | Tracking y leading ópticos sobre el texto final | Compresión o apertura extrema para hacerlo caber |
| Imagen | Zona estable o protección diseñada | Texto/logo sobre detalle variable sin medición |
| Logo | Versión con contraste y aire sostenidos | Wordmark blanco perdido sobre fotografía clara |
| Producción | Medio limpio + overlay determinista | Texto crítico generado dentro de la imagen |
| Bounding box | Se adapta a texto/objeto/grupo y agrega aire proporcional | Dimensión fija o borde pegado a una cara |
| Cursor local | Hotspot sobre anclaje; `screen-fixed` mantiene orientación familiar | Flecha invertida, sin relleno o separada del target |
| Multiplayer | Punta y placa separadas pero próximas; label libre | Puntero decorativo, placa huérfana o identidad hardcodeada |
| Estado moving | Presencia conjunta en región semántica, sin tocar selección | Target/anclaje fingido para justificar su posición |
| Portabilidad | Manifest normalizado + adapter conformante | Copiar CSS del Lab o usar coordenadas libres |
| Niveles de texto | Vecinos distintos en ≥ 2 ejes (peso, tinta, escala, familia) | Entrada y dominante con el mismo peso y color |
| Acento de color | Naranja sobre cielo oscurecido, medido aparte y revisado a 390 px | Naranja sobre horizonte encendido (1–2:1) sin degradar a peso |
| Tarjeta HUD | Vidrio esmerilado real del plate, función narrativa | Rectángulo plano de color detrás del texto |
| Scrim | Sólo ilustración y declarado por lámina | **Cualquier scrim en fotografía de marca** (2026-09-19) |
| Tarjeta HUD en foto | Dato como texto limpio sobre zona clara de la foto | Tarjeta de vidrio con línea naranja (era de GTA VI) |
| Marcador-estrella | Sólo el post de GTA VI (marcaba la misión) | Estrella junto a la etiqueta en cualquier otra pieza |
| Propósito del bounding box | Enmarca un objeto con sentido (obra en revisión, resultado aprobado) o una palabra del titular | Caja sobre vacío, sobre una persona, o «porque sí» |
| Firma web | url-lum con evidencia `non-separable-luminosity`; si el logo 3D es héroe, sólo url-lum | Segundo logo plano compitiendo con el héroe |

## Salida de la revisión

Registra `PASS | REWORK | DON’T` por jerarquía, tipografía, contraste, marca, safe area, formato, motion y
derechos. Un PASS técnico no equivale a aprobación humana ni publicación. Si hay REWORK, nombra el defecto y la
operación concreta que lo corrige.
